#[derive(Debug, Clone)]
pub struct Script {
    pub handlers: Vec<Handler>,
}

#[derive(Debug, Clone)]
pub struct Handler {
    pub name: String,
    pub params: Vec<String>,
    pub body: Vec<Statement>,
}

#[derive(Debug, Clone)]
pub enum Statement {
    Put {
        value: Expression,
        target: Expression,
    },
    Go {
        destination: GoDestination,
    },
    If {
        condition: Expression,
        then_body: Vec<Statement>,
        else_body: Option<Vec<Statement>>,
    },
    Repeat {
        var: String,
        start: Expression,
        end: Expression,
        body: Vec<Statement>,
    },
    RepeatWhile {
        condition: Expression,
        body: Vec<Statement>,
    },
    Set {
        property: PropertyRef,
        value: Expression,
    },
    Show {
        target: Expression,
    },
    Hide {
        target: Expression,
    },
    Answer {
        message: Expression,
    },
    Ask {
        prompt: Expression,
    },
    PlaySound {
        sound: Expression,
    },
    Wait {
        duration: Expression,
    },
    Pass {
        message: String,
    },
    Return {
        value: Option<Expression>,
    },
    Send {
        message: String,
        target: Expression,
    },
    Global {
        names: Vec<String>,
    },
    Fetch {
        url: Expression,
        target: Expression,
    },
    ExpressionStatement {
        expr: Expression,
    },
}

#[derive(Debug, Clone)]
pub enum GoDestination {
    Next,
    Prev,
    First,
    Last,
    CardByName(String),
    CardByExpr(Expression),
}

#[derive(Debug, Clone)]
pub enum Expression {
    StringLiteral(String),
    NumberLiteral(f64),
    BoolLiteral(bool),
    Variable(String),
    FieldRef {
        name: Box<Expression>,
    },
    ButtonRef {
        name: Box<Expression>,
    },
    BinaryOp {
        left: Box<Expression>,
        op: BinaryOp,
        right: Box<Expression>,
    },
    UnaryOp {
        op: UnaryOp,
        operand: Box<Expression>,
    },
    FunctionCall {
        name: String,
        args: Vec<Expression>,
    },
    PropertyOf {
        property: String,
        object: Box<Expression>,
    },
    ChunkExpr {
        chunk_type: ChunkType,
        index: Box<Expression>,
        source: Box<Expression>,
    },
    It,
    Empty,
}

#[derive(Debug, Clone)]
pub struct PropertyRef {
    pub property: String,
    pub object: Expression,
}

#[derive(Debug, Clone, PartialEq)]
pub enum BinaryOp {
    Add,
    Subtract,
    Multiply,
    Divide,
    Concat,
    ConcatWithSpace,
    Equal,
    NotEqual,
    LessThan,
    GreaterThan,
    LessOrEqual,
    GreaterOrEqual,
    And,
    Or,
    Is,
    Mod,
    Exponent,
    Contains,
}

#[derive(Debug, Clone, PartialEq)]
pub enum UnaryOp {
    Not,
    Negate,
}

#[derive(Debug, Clone, PartialEq)]
pub enum ChunkType {
    Character,
    Word,
    Item,
    Line,
}
