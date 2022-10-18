if (!process.env['ACCOUNT_EMAIL']) {
    throw new Error("no email provided")
}

if (!process.env['ACCOUNT_PASSWORD']) {
    throw new Error("no password provided")
}


export default {
    justEat: {
        email: process.env['ACCOUNT_EMAIL'],
        password: process.env['ACCOUNT_PASSWORD']
    }
}
