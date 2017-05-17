import * as acorn from "acorn";
import * as babel from "babel-core";
import * as ESTree from "estree";
import * as log4js from "log4js";

import * as kt from "karma-typescript/src/api/transforms";

let log: log4js.Logger;

// detect module.exports = xx
let isStatementEs5Export = (expression: ESTree.Expression):boolean => {
    if (expression.type === "AssignmentExpression"
        && expression.operator === "="
        && expression.left.type === "MemberExpression"
        && expression.left.object.type === "Identifier"
        && expression.left.property.type === "Identifier") {
        return expression.left.object.name === "module" && expression.left.property.name === "exports";
    }
    else {
        return false;
    }
};

let isEs6 = (ast: ESTree.Program): boolean => {
    if (ast.body) {
        for (let statement of ast.body) {
            switch (statement.type) {
                case "ExportAllDeclaration":
                case "ExportDefaultDeclaration":
                case "ExportNamedDeclaration":
                case "ImportDeclaration":
                    return true;
                case "ExpressionStatement": 
                    if(isStatementEs5Export(statement.expression)){
                        return true;
                    }
                default:
            }
        }
    }
    return false;
};

let configure = (options?: babel.TransformOptions) => {

    options = options || {};

    if (!options.presets || options.presets.length === 0) {
        options.presets = ["es2015"];
    }

    let transform: kt.Transform = (context: kt.TransformContext, callback: kt.TransformCallback) => {

        if (!context.js) {
            return callback(undefined, false);
        }

        if (isEs6(context.js.ast)) {

            if (!options.filename) {
                options.filename = context.filename;
            }

            log.debug("Transforming %s", options.filename);

            try {
                context.source = babel.transform(context.source, options).code;
                context.js.ast = acorn.parse(context.source, { sourceType: "module" });
                return callback(undefined, true);
            }
            catch (error) {
                return callback(error, false);
            }
        }
        else {
            return callback(undefined, false);
        }
    };

    let initialize: kt.TransformInitialize = (logOptions: kt.TransformInitializeLogOptions) => {
        log4js.setGlobalLogLevel(logOptions.level);
        log4js.configure({ appenders: logOptions.appenders });
        log = log4js.getLogger("es6-transform.karma-typescript");
    };

    return Object.assign(transform, { initialize });
};

export = configure;
