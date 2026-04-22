import dotenv from "dotenv"

dotenv.config();

interface Config {
    port: number;
    nodeEnv: string;
    mongo_uri: string;
    frontend_uri: string;
    mail: {
        mail_from: string;
        smtp: {
            host: string;
            port: string;
            user: string;
            pass: string;
            secure: boolean;
        },
        oauth2: {
            user: string;
            clientId: string;
            clientSecret: string;
            refreshToken: string;
            accessToken: string;
        },

    },
    tokens: {
        jwt_secret: string,
        jwt_refresh_secret: string,
        admin_jwt_secret: string,
        doctor_jwt_secret: string,
    }

}
const config: Config = {
    port: Number(process.env.PORT) || 3000,
    nodeEnv: process.env.NODE_ENV || "development",
    mongo_uri: process.env.MONGO_URI!,
    frontend_uri: process.env.FRONTEND_URI || 'http://localhost',
    mail: {
        mail_from: process.env.EMAIL_FROM || "",
        smtp: {
            host: process.env.SMTP_HOST || "",
            port: process.env.SMTP_PORT || "",
            user: process.env.SMTP_USER || "",
            pass: process.env.SMTP_PASS || "",
            secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : false,
        },
        oauth2: {
            user: process.env.OAUTH_USER || "",
            clientId: process.env.OAUTH_CLIENT_ID || "",
            clientSecret: process.env.OAUTH_CLIENT_SECRET || "",
            refreshToken: process.env.OAUTH_REFRESH_TOKEN || "",
            accessToken: process.env.OAUTH_ACCESS_TOKEN || "",
        },

    },
    tokens: {
        jwt_secret: process.env.JWT_SECRET || "",
        jwt_refresh_secret: process.env.ADMIN_JWT_SECRET || "",
        admin_jwt_secret: process.env.JWT_REFRESH_SECRET || "",
        doctor_jwt_secret: process.env.DOCTOR_JWT_SECRET || "",
    }

}


export default config