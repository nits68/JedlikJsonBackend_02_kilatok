"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const express_1 = tslib_1.__importDefault(require("express"));
const cors_1 = tslib_1.__importDefault(require("cors"));
const fs_1 = require("fs");
const morgan_1 = tslib_1.__importDefault(require("morgan"));
const swagger_ui_express_1 = tslib_1.__importDefault(require("swagger-ui-express"));
const swagger_output_json_1 = tslib_1.__importDefault(require("../backend/swagger-output.json"));
const app = (0, express_1.default)();
const PORT = 3000;
// Middleware to parse request body
app.use(express_1.default.json());
// Add Swagger UI to the app
const options = { swaggerOptions: { tryItOutEnabled: true } };
app.use("/docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_output_json_1.default, options));
// Enabled CORS (Cross-Origin Resource Sharing):
app.use((0, cors_1.default)());
// Logger middleware: log all requests to the console
app.use((0, morgan_1.default)("dev"));
app.get("/api/viewpoints", async (req, res) => {
    // #swagger.tags = ['Viewpoints']
    // #swagger.summary = 'Az összes kilátó kivonatolt adatainak lekérdezése'
    const data = await readDataFromFile("viewpoints");
    if (data) {
        res.send(data
            .map((v) => {
            return {
                id: v.id,
                viewpointName: v.viewpointName,
                mountain: v.mountain,
            };
        })
            .sort((a, b) => a.id - b.id));
    }
    else {
        res.status(404).send({ message: "Error while reading data." });
    }
});
app.get("/api/:locationName/viewpoints", async (req, res) => {
    try {
        // #swagger.tags = ['Viewpoints']
        // #swagger.summary = 'A megadott hegység kilátóit kérdezi le'
        // #swagger.parameters['locationName'] = { example: 'Bükk'}
        const locations = await readDataFromFile("locations");
        const location = locations.find(e => e.locationName === req.params.locationName);
        if (location) {
            const viewpoints = await readDataFromFile("viewpoints");
            const filteredViewpoints = viewpoints.filter(e => e.locationId === location.id);
            res.send(filteredViewpoints.sort((a, b) => a.id - b.id));
        }
        else {
            res.status(404).send({ message: "Ebben a helységben nem találtam kilátót." });
        }
    }
    catch (error) {
        res.status(400).send({ message: error.message });
    }
});
app.get("/api/locations", async (req, res) => {
    // #swagger.tags = ['Locations']
    // #swagger.summary = 'Hegységek lekérdezése'
    try {
        const locations = await readDataFromFile("locations");
        if (locations) {
            res.send(locations.sort((a, b) => a.id - b.id));
        }
        else {
            res.status(404).send({ message: "Error while reading data." });
        }
    }
    catch (error) {
        res.status(400).send({ message: error.message });
    }
});
app.post("/api/rate", async (req, res) => {
    // #swagger.tags = ['Rates']
    // #swagger.summary = 'Kilátóról értékelés készítése'
    /*  #swagger.requestBody = {
            required: true,
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            viewpointId: { type: "number" },
                            rating: { type: "number" },
                            email: { type: "string" },
                            comment: { type: "string" }
                        },
                        example: {
                            viewpointId: 15,
                            rating: 8,
                            email: "kiss.dora@mail.hu",
                            comment: "Nagyon szép kilátás!"
                        }
                    }
                }
            }
        }
    */
    try {
        const newRate = req.body;
        if (!newRate.viewpointId || !newRate.rating || !newRate.email) {
            throw new Error("Validation failed: hiányzó adatok.");
        }
        if (newRate.rating < 1 || newRate.rating > 10) {
            throw new Error("Validation failed: az értékelésnek 1-10 közötti értéknek kell lennie.");
        }
        const rates = await readDataFromFile("rates");
        const alreadyRated = rates.find(e => e.viewpointId === newRate.viewpointId && e.email === newRate.email);
        if (alreadyRated) {
            throw new Error("Validation failed: ezzel az e-mailcímmel ezt a kilátót már értékelték.");
        }
        newRate.id = rates.length + 1;
        rates.push(newRate);
        const response = await saveDataToFile("rates", rates);
        if (response == "OK") {
            const thisViewpointRaits = rates.filter(e => e.viewpointId === newRate.viewpointId);
            res.send({
                count: thisViewpointRaits.length,
                average: thisViewpointRaits.reduce((acc, e) => acc + parseFloat(e.rating), 0) / thisViewpointRaits.length,
            });
        }
        else {
            res.status(400).send({ message: response });
        }
    }
    catch (error) {
        res.status(400).send({ message: error.message });
    }
});
// Read operation
// app.get("/read/:id", (req: Request, res: Response) => {
//     const data = readDataFromFile();
//     const item = data.find(item => item.id === parseInt(req.params.id));
//     if (item) {
//         res.send(item);
//     } else {
//         res.status(404).send("Item not found.");
//     }
// });
// Update operation
// app.put("/update/:id", (req: Request, res: Response) => {
//     const data = readDataFromFile();
//     const index = data.findIndex(item => item.id === parseInt(req.params.id));
//     if (index !== -1) {
//         data[index] = req.body;
//         saveDataToFile(data);
//         res.send("Item updated successfully.");
//     } else {
//         res.status(404).send("Item not found.");
//     }
// });
// Delete operation
// app.delete("/delete/:id", (req: Request, res: Response) => {
//     const data = readDataFromFile();
//     const index = data.findIndex(item => item.id === parseInt(req.params.id));
//     if (index !== -1) {
//         data.splice(index, 1);
//         saveDataToFile(data);
//         res.send("Item deleted successfully.");
//     } else {
//         res.status(404).send("Item not found.");
//     }
// });
app.listen(PORT, () => {
    console.log(`Jedlik Json-Backend-Server Swagger: http://localhost:${PORT}/docs`);
});
// Utility functions to read/write data from/to file
async function readDataFromFile(table) {
    try {
        const data = await fs_1.promises.readFile(`db_${table}.json`, "utf8");
        return JSON.parse(data);
    }
    catch (error) {
        console.error(error);
        return [];
    }
}
async function saveDataToFile(table, data) {
    try {
        await fs_1.promises.writeFile(`db_${table}.json`, JSON.stringify(data, null, 2), "utf8");
        return "OK";
    }
    catch (error) {
        return error.message;
    }
}
//# sourceMappingURL=backend.js.map