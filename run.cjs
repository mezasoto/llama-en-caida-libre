
import("./dist/server.js").catch((error) => {
  console.error("Error al iniciar LlamaLab:", error);
  process.exitCode = 1;
});
