import axios from "axios";

class SMSHelper {
    private africasTalkingConfig: {
        username: string;
        apiKey: string;
        shortCode: string | null;
        baseUrl: string;
    } | null = null;
    private smsTemplates: { [key: string]: string } = {};

    constructor() {
    }
    initializeSMSClient() {
        const username = process.env.AFRICAS_TALKING_USERNAME || 'clic';
        const apiKey = process.env.AFRICAS_TALKING_API_KEY || 'atsk_74da8164a70477581959b283adca4cf0c0715ca5ecb09eb154fa551c7556c206f8dca5a4';
        const shortCode = process.env.AFRICAS_TALKING_SHORT_CODE || null
        const baseUrl = process.env.AFRICAS_TALKING_BASE_URL || 'https://api.africastalking.com/version1/messaging';
        try {
            if (username && apiKey) {
                this.africasTalkingConfig = {
                    username: username,
                    apiKey: apiKey,
                    shortCode: shortCode || null,
                    baseUrl: baseUrl
                };
            }
        } catch (error) {
            console.error('Failed to initialize SMS client:', error);
        }
    }

    async sendEgoSMS(phoneNumber: string, message: string) {

        const url = "https://www.egosms.co/api/v1/json/"
        const body = {
            "method": "SendSms",
            "userdata": {
                "username": "bavana",
                "password": "q2Q@HFvQhCrZtuV"
            },
            "msgdata": [
                {
                    "number": phoneNumber,
                    "message": message,
                    "senderid": "Egosms",
                    "priority": "0"
                }
            ]
        }
        const response = await axios.post(url, body);
        console.log(response.data);
        return response.data;
     }

    async sendSMS(options: any) {
        try {
            if (!this.africasTalkingConfig) {
                throw new Error('Africa\'s Talking SMS client not initialized');
            }

            let { to, message, template, templateData, from } = options;

            // Validate phone number
            if (!/^\+\d{10,15}$/.test(to)) {
                throw new Error('Invalid phone number format. Ensure it starts with "+" followed by 10-15 digits.');
            }



            // Prepare the request data
            const requestData = new URLSearchParams({
                username: this.africasTalkingConfig.username,
                to: to,
                message: message
            });

            // Add sender ID if provided or configured
            if (from) {
                requestData.append('from', from);
            } else if (this.africasTalkingConfig.shortCode) {
                requestData.append('from', this.africasTalkingConfig.shortCode);
            }

            // Make the API request
            const response = await fetch(this.africasTalkingConfig.baseUrl, {
                method: 'POST',
                headers: {
                    'apiKey': this.africasTalkingConfig.apiKey,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: requestData
            });

            const result = await response.json();

            if (result.SMSMessageData && result.SMSMessageData.Recipients && result.SMSMessageData.Recipients.length > 0) {
                const recipient = result.SMSMessageData.Recipients[0];

                if (recipient.status === 'Success') {
                    console.log('SMS sent successfully:', recipient.messageId);
                    return {
                        success: true,
                        messageId: recipient.messageId
                    };
                } else {
                    throw new Error(`Failed to send SMS: ${recipient.status}`);
                }
            }

            throw new Error('Failed to send SMS: Invalid response from Africa\'s Talking');
        } catch (error) {
            console.error('Error sending SMS:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    private replaceTemplateVars(template: string, data: { [key: string]: string }): string {
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || match);
    }
}

export default SMSHelper;