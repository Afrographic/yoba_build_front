const { HelperFunction } = require("./helper_function");
const { Ucase } = require("./validator");

function serverError(error, res) {
    console.log(error);
    // SequelizeUniqueConstraintError
    let errorsMessages = extractsMessagesFromErrorObjects(error.errors);
    console.log(errorsMessages);
    res.statusCode = 504;
    res.send({
        msg: errorsMessages
    })

}

function extractsMessagesFromErrorObjects(errors) {
    let errorsMessages = [];
    if (errors != undefined) {
        errors.forEach(function (errorItem) {
            errorsMessages.push(HelperFunction.Ucase(errorItem.message));
        });
    }
    return errorsMessages;
}

module.exports.serverError = serverError;