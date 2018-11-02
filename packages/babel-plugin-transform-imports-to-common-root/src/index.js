import { relative, dirname } from "path";
const resolve = require("resolve");

const requireToPath = (req, filedir, basedir) =>
  relative(basedir, resolve.sync(req, { basedir: filedir }));

export const TransformImportsToCommonRoot = (module = {}) => {
  return function() {
    function isValidRequireCall(nodepath) {
      if (!nodepath.isCallExpression()) return false;
      if (!nodepath.get("callee").isIdentifier({ name: "require" })) {
        return false;
      }
      if (nodepath.scope.getBinding("require")) return false;

      const args = nodepath.get("arguments");
      if (args.length !== 1) return false;

      const arg = args[0];
      if (!arg.isStringLiteral()) return false;

      return true;
    }

    const AmdVisitor = (filedir, basedir, dependencyPaths) => ({
      CallExpression(nodepath) {
        if (!isValidRequireCall(nodepath)) return;
        const req = nodepath.node.arguments[0].value;
        const newPath = requireToPath(req, filedir, basedir);
        nodepath.node.arguments[0].value = newPath;
        dependencyPaths.push(newPath);
      },
    });

    return {
      visitor: {
        Program: {
          exit(nodepath, { cwd, filename }) {
            if (this.ran) return;
            this.ran = true;

            const filedir = dirname(filename);
            module.dependencyPaths = [];
            nodepath.traverse(
              AmdVisitor(filedir, cwd, module.dependencyPaths),
              this,
            );
          },
        },
      },
    };
  };
};

export default TransformImportsToCommonRoot();
