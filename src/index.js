import app from "./app.js";
import './db/index.js';

const port = 3008;

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
