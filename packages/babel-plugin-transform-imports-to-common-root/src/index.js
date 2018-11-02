import { basename, extname, relative, dirname, join } from "path";
import transformCommonjs from "babel-plugin-transform-es2015-modules-commonjs";

requireToPath = (req, filedir, basedir) => 
  relative(
    basedir, 
    resolve.sync(/\(\s*('|")(.*)('|")\s*\)/g.exec(req)[2], { basedir: filedir }));

export default function({ types: t }) {
  function isValidRequireCall(nodepath) {
    if (!nodepath.isCallExpression()) return false;
    if (!nodepath.get("callee").isIdentifier({ name: "require" })) return false;
    if (nodepath.scope.getBinding("require")) return false;

    const args = nodepath.get("arguments");
    if (args.length !== 1) return false;

    const arg = args[0];
    if (!arg.isStringLiteral()) return false;

    return true;
  }

  const AmdVisitor = (filedir, basedir) => ({
    CallExpression(nodepath) {
      if (!isValidRequireCall(nodepath)) return;
      const req = nodepath.node.arguments[0].value;
      nodepath.node.arguments[0].value = requireToPath(req, filedir, basedir)
    },

    VariableDeclarator(nodepath) {
      const id = nodepath.get("id");
      if (!id.isIdentifier()) return;

      const init = nodepath.get("init");
      if (!isValidRequireCall(init)) return;

      const req = init.node.arguments[0].value;
      nodepath.node.arguments[0].value = requireToPath(req, filedir, basedir)
    },
  });

  return {
    inherits: transformCommonjs,

    visitor: {
      Program: {
        exit(nodepath, { cwd, filename }) {
          if (this.ran) return;
          this.ran = true;

          const filedir = path.dirname(filename);

          nodepath.traverse(AmdVisitor(filedir, cwd), this);
        },
      },
    },
  };
}
