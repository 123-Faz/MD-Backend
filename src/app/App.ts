import http, { Server } from "http"
import express, { Express } from "express"
import path from "path";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import cors from 'cors'
import compression from "compression";
import fileUpload from "express-fileupload";
import router from "@/routes/routes";
import { createStorageFolders } from "@/config/filestorage";
import config from "@/config/config";
import routeNotFoundMiddleware from "@/middlewares/routeNotFoundMiddleware";
import defaultErrorHandler from "@/middlewares/defaultErrorHandler";


class App {
    port: number;
    server!: Server;
    app!: Express;

    constructor(port: number) {
        this.port = port;
        this.serverInit();
        this.loadPlugins();
        this.loadRoutes();
        this.loadExceptionMiddlewares();
    }
    loadPlugins() {
        this.app.use(express.json());
        this.app.use(express.static(path.resolve(__dirname, "../public")))
        this.app.use("/storage", express.static(path.resolve(__dirname, "../storage")))

        this.app.use(cors({
            origin: [config.frontend_uri],
            optionsSuccessStatus: 200,
            credentials: true
        }));
        this.app.use(helmet())
        this.app.use(cookieParser())
        this.app.use(compression())
        this.app.use(fileUpload({
            useTempFiles: true,
            tempFileDir: '/tmp/',
            // abortOnLimit: true,
            // limits: { fileSize: 10 * 1024 * 1024 }
        }))

    }
    loadRoutes() {
        this.app.use('/', router)
    }
    loadExceptionMiddlewares() {
        this.app.use(routeNotFoundMiddleware);
        this.app.use(defaultErrorHandler);
    }
    serverInit() {

        this.app = express();
        this.server = http.createServer(this.app);
        createStorageFolders()
    }
    startServer() {
        this.server.listen(this.port, () => {
            console.log(`[Server]: Running on http://127.0.0.1:${this.port}`);

        })
    }
}
export default App