import express, { Request, Response } from "express";
import cors from "cors";
import { promises as fs } from "fs";
import morgan from "morgan";

const app = express();
const PORT = 3000;

// Middleware to parse request body
app.use(express.json());

// Enabled CORS (Cross-Origin Resource Sharing):
app.use(cors());

// Logger middleware: log all requests to the console
app.use(morgan("dev"));

app.get("/api/viewpoints", async (req: Request, res: Response) => {
    const data = await readDataFromFile("viewpoints");
    if (data) {
        res.send(
            data
                .map((v: any) => {
                    return {
                        id: v.id,
                        viewpointName: v.viewpointName,
                        mountain: v.mountain,
                    };
                })
                .sort((a: any, b: any) => a.id - b.id),
        );
    } else {
        res.status(404).send({ message: "Error while reading data." });
    }
});

// Read and create limited journey data
app.get("/api/:locationName/viewpoints", async (req: Request, res: Response) => {
    try {
        const locations = await readDataFromFile("locations");
        const location = locations.find(e => e.locationName === req.params.locationName);
        if (location) {
            const viewpoints = await readDataFromFile("viewpoints");
            const filteredViewpoints = viewpoints.filter(e => e.locationId === location.id);
            res.send(filteredViewpoints.sort((a: any, b: any) => a.id - b.id));
        } else {
            res.status(404).send({ message: "Ebben a helységben nem találtam kilátót." });
        }
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

// Read and create limited journey data
app.get("/api/locations", async (req: Request, res: Response) => {
    try {
        const locations = await readDataFromFile("locations");
        if (locations) {
            res.send(locations.sort((a: any, b: any) => a.id - b.id));
        } else {
            res.status(404).send({ message: "Error while reading data." });
        }
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

// POST operation to create a new journey
app.post("/api/rate", async (req: Request, res: Response) => {
    try {
        const newRate: any = req.body;
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
                average: thisViewpointRaits.reduce((acc: number, e) => acc + parseFloat(e.rating), 0) / thisViewpointRaits.length,
            });
        } else {
            res.status(400).send({ message: response });
        }
    } catch (error) {
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
    console.log(`Jedlik Json-Backend-Server listening on port ${PORT}`);
});

// Utility functions to read/write data from/to file
async function readDataFromFile(table: string): Promise<any[]> {
    try {
        const data = await fs.readFile(`db_${table}.json`, "utf8");
        return JSON.parse(data);
    } catch (error) {
        console.error(error);
        return [];
    }
}

async function saveDataToFile(table: string, data: any[]): Promise<string> {
    try {
        await fs.writeFile(`db_${table}.json`, JSON.stringify(data, null, 2), "utf8");
        return "OK";
    } catch (error) {
        return error.message;
    }
}
