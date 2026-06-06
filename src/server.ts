import { app } from "./app.js";
import { env } from "./config/env.js";

const PORT = env.APP_PORT;

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
