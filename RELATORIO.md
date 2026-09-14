# RELATORIO

## Decisões técnicas

Decidi manter as telas bem simples para o usuário poder jogar as informações rápido e mostrar o resultado para o cliente sem perder tempo.

Também decidi deixar a página do admin bem transparente e customizável, para ter o máximo de controle sobre a aplicação.

## O que foi testado

Testei todas as opções usando os números dados na tabela e também mexi em todos os parâmetros do admin para ver se estava tudo nos conformes.

Além disso, fiz testes automatizados usando a tabela dada para poder testar rapidamente se havia erros simples com os testes básicos.

## O que não foi testado

Não testei a utilização com o admin trocando os parâmetros enquanto o cliente usava a ferramenta.

Também não testei o que aconteceria se dois admins mudassem os parâmetros juntos.

## Fragilidades da aplicação

Acredito que ela funcionaria bem se fosse algo sem muitas alterações durante o funcionamento.

Outro ponto frágil é que não tem nada que persista as alterações do admin caso o servidor seja reiniciado.

Se eu fosse evoluir isso para um uso mais real, eu provavelmente adicionaria um banco de dados para salvar os cálculos e criaria credenciais individuais para aumentar o controle sobre os parâmetros de cada usuário.

## O que eu perguntaria ao cliente antes de colocar em produção

Eu perguntaria se o programa vai ser usado entre várias unidades.

Também perguntaria se vários vendedores usariam o mesmo sistema, para conversar sobre credenciais individuais tanto para admin quanto para clientes.
