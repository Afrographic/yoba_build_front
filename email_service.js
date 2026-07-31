
const nodemailer = require('nodemailer');

const AFRO_LOGO = "/../public/images/afrographix_logo.jpg";

class EmailService {
    static transporter;
    static init() {
        this.transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            auth: {
                user: "monraa.tech@gmail.com",
                pass: 'zhfwmpiggecxxizv',
            },
        });

        this.transporter.verify().then(console.log("Connected To Mail Service")).catch(console.error);
    }

    static async send_account_activation_code(username, email, code) {
        try {
            let body = `
                <div style="padding:18px;border:1px solid rgba(170, 170, 170, 0.616);border-radius:12px;">
                  <p>Hi ${username},</p>
                  <h1>${code}</h1>
                  <p>est le code de verification de votre compte sur Lidav</p>
                </div>
                <div style="font-size:11px;margin-top:32px;padding:16px;text-align:center"> 
                    <table width="100%">
                        <tr>
                            <td>
                                 <img src="cid:monraa_logo" width="25px">
                            </td>
                        </tr>
                        <tr>
                            <td>
                                 From <b>Afrographix Studio</b> 
                            </td>
                        </tr>
                    </table>
                    
                    
                </div>
                `;
            this.transporter.sendMail({
                from: '"Lidav" <monraa.tech@gmail.com>', // sender address
                to: email, // list of receivers
                subject: "Verification de compte", // Subject line
                attachments: [{
                    filename: 'monraa_logo.png',
                    path: __dirname + AFRO_LOGO,
                    cid: 'monraa_logo'
                }],
                html: body, // html body
            }).then(info => {
                console.log({ info });
            }).catch(console.error);

        } catch (error) {
            console.log(error)
        }

    }

    static async send_account_unlock_code(username, email, code) {
        try {
            let body = `
                <div style="padding:18px;border:1px solid rgba(170, 170, 170, 0.616);border-radius:12px;">
                  <p>Hi ${username},</p>
                  <h1>${code}</h1>
                  <p>est le code de deverouillage de la zone de modification de mot de passe  de votre compte sur Lidav</p>
                </div>
                <div style="font-size:11px;margin-top:32px;padding:16px;text-align:center"> 
                    <table width="100%">
                        <tr>
                            <td>
                                 <img src="cid:monraa_logo" width="25px">
                            </td>
                        </tr>
                        <tr>
                            <td>
                                 From <b>Afrographix Studio</b> 
                            </td>
                        </tr>
                    </table>
                    
                    
                </div>
                `;
            this.transporter.sendMail({
                from: '"Lidav" <monraa.tech@gmail.com>', // sender address
                to: email, // list of receivers
                subject: "Code de deverouillage", // Subject line
                attachments: [{
                    filename: 'monraa_logo.png',
                    path: __dirname + AFRO_LOGO,
                    cid: 'monraa_logo'
                }],
                html: body, // html body
            }).then(info => {
                console.log({ info });
            }).catch(console.error);

        } catch (error) {
            console.log(error)
        }

    }


    static async send_password_reset_link(username, email, reset_password_link) {
        try {
            let body = `
                <div style="padding:18px;border:1px solid rgba(170, 170, 170, 0.616);border-radius:12px;">
                  <p>Hi ${username},</p>
                  <p>Cliquez sur le lien ci dessous pour reinitialiser votre mot de passe</p>

                  <a href="${reset_password_link}" style='text-decoration:none;' >
                    <div style="box-sizing:border-box;background-color:#00145A;color:white;padding:16px;border-radius:8px;margin:8px 0px;width:100%;text-align:center;">
                        Reinitialiser mon mot de passe
                    </div>
                
                  </a>
                  <div style="margin-top:16px;border:1px solid red;color:red;padding:16px;border-radius:8px;text-align:center;margin:8px 0px;">Ce lien expire dans 10 minutes</div>
                </div>
                <div style="font-size:11px;margin-top:32px;padding:16px;text-align:center"> 
                    <table width="100%">
                        <tr>
                            <td>
                                 <img src="cid:monraa_logo" width="25px">
                            </td>
                        </tr>
                        <tr>
                            <td>
                                 From <b>Afrographix Studio</b> 
                            </td>
                        </tr>
                    </table>
                    
                    
                </div>
                `;
            this.transporter.sendMail({
                from: '"Lidav" <monraa.tech@gmail.com>', // sender address
                to: email, // list of receivers
                subject: "Lidav Account verification", // Subject line
                attachments: [{
                    filename: 'monraa_logo.png',
                    path: __dirname + AFRO_LOGO,
                    cid: 'monraa_logo'
                }],
                html: body, // html body
            }).then(info => {
                console.log({ info });
            }).catch(console.error);

        } catch (error) {
            console.log(error)
        }

    }
}


module.exports.EmailService = EmailService;