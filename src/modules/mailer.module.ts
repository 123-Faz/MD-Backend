import { createTransport, type TransportOptions } from "nodemailer"
import { compile as ejsCompile } from "ejs"
import config from "@/config/config"

export const SMTPMailer = createTransport({
    host: config.mail.smtp.host,
    port: config.mail.smtp.port,
    secure: config.mail.smtp.secure, // true for 465, false for other ports
    auth: {
        user: config.mail.smtp.user,
        pass: config.mail.smtp.pass // Replace with real password
    }
} as TransportOptions)


export const OAuthMailer = createTransport({
    service: "gmail",
    auth: {
        type: "OAuth2",
        user: config.mail.oauth2.user,
        clientId: config.mail.oauth2.clientId,
        clientSecret: config.mail.oauth2.clientSecret,
        refreshToken: config.mail.oauth2.refreshToken,
    }
})

export const renderEjsHTMLStr = async (template: string, data = {}): Promise<string> => {
    return new Promise((resolve, reject) => {
        try {
            const compiledEjs = ejsCompile(template)
            const emailHtml = compiledEjs(data)
            resolve(emailHtml)
        }
        catch (error) {
            reject(error)
        }
    })
}