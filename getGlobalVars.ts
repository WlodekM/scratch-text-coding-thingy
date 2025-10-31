import type {
	AssignmentNode,
	ASTNode,
	BinaryExpressionNode,
	BranchFunctionCallNode,
	FunctionCallNode,
	FunctionDeclarationNode,
	GreenFlagNode,
	IfNode,
	ListDeclarationNode,
	NotNode,
	ReturnNode,
	StartBlockNode,
	ForNode,
  LiteralNode,
  VariableDeclarationNode
} from "./tshv2/main.ts";

export function getNodeChildren(node: ASTNode): ASTNode[] {
	const children: ASTNode[] = [];

	let n;
	n = node as FunctionDeclarationNode;
	if (n.type == 'FunctionDeclaration') {
		children.push(...n.body)
	}
	n = node as AssignmentNode;
	if (n.type == 'Assignment') {
		children.push(n.value)
	}
	n = node as BinaryExpressionNode;
	if (n.type == 'BinaryExpression') {
		children.push(n.left, n.right)
	}
	n = node as NotNode;
	if (n.type == 'Not') {
		children.push(n.body)
	}
	n = node as FunctionCallNode;
	if (n.type == 'FunctionCall') {
		children.push(...n.args)
	}
	n = node as BranchFunctionCallNode;
	if (n.type == 'BranchFunctionCall') {
		children.push(...n.args, ...n.branches.reduce<ASTNode[]>((p, c) => {
			p.push(...c);
			return p;
		}, []))
	}
	n = node as StartBlockNode;
	if (n.type == 'StartBlock') {
		children.push(...n.body)
	}
	n = node as IfNode;
	if (n.type == 'If') {
		children.push(...n.thenBranch, ...(n.elseBranch??[]),n.condition)
	}
	//FIXME - implement this
	n = node as ForNode;
	if (n.type == 'For') {
		children.push(...n.branch, n.times, n.varname)
	}
	n = node as GreenFlagNode;
	if (n.type == 'GreenFlag') {
		children.push(...n.branch)
	}
	n = node as ListDeclarationNode;
	if (n.type == 'ListDeclaration') {
		children.push(...n.value)
	}
	n = node as ReturnNode;
	if (n.type == 'Return') {
		children.push(n.value)
	}

	return children
}

let varId = 0;
function genId(num: number): string {
	let result = "";
	while (num > 0) {
		num--;
		result = String.fromCharCode(97 + (num % 26)) + result;
		num = Math.floor(num / 26);
	}
	return result;
}

function genVarId(name: string): string {
	varId++
	return genId(varId) + '-' + name
}

function uhj(
	node: ASTNode,
	globalVariables: Record<string, string>,
	globalLists: Record<string, [string, string[]]>
): [Record<string, string>, Record<string, [string, string[]]>] {
	// console.log(node.type)
	j:
	if ((node as ListDeclarationNode).type == 'ListDeclaration') {
		const listDeclNode = node as ListDeclarationNode;
		if (listDeclNode.vtype != 'global')
			break j;
		const lid: string = genVarId(listDeclNode.identifier);
		globalLists[listDeclNode.identifier] = [lid, listDeclNode.value.map(n => (n as LiteralNode).value.toString())]
	}
	k:
	if ((node as VariableDeclarationNode).type == 'VariableDeclaration') {
		const varDeclNode = node as VariableDeclarationNode;
		// console.log('varDecl!', varDeclNode.vtype)
		if (varDeclNode.vtype != 'global')
			break k;
		const id: string = genVarId(varDeclNode.identifier);
		globalVariables[varDeclNode.identifier] = id
	}
	for (const child of getNodeChildren(node)) {
		[globalVariables, globalLists] = uhj(child, globalVariables, globalLists)
	}
	return [globalVariables, globalLists]
}

export default function processSprite(ast: ASTNode[],
	globalVariables: Record<string, string> = {},
	globalLists: Record<string, [string, string[]]> = {}
): [Record<string, string>, Record<string, [string, string[]]>] {
	for (const node of ast) {
		[globalVariables, globalLists] = uhj(node, globalVariables, globalLists)
	}
	return [globalVariables, globalLists]
}
