Diretrizes Globais do Agente

Toda a arquitetura e especificações (SDD) deste sistema estão documentadas na raiz do projeto.
Sempre que for gerar um código ou iniciar uma nova sessão, você deve basear a implementação estritamente nestes dois arquivos:

    /arquitetura.md -> Para regras do monorepo NestJS, isolamento de infraestrutura, Docker e restrições dos RPAs.

    /sdd_specs.md -> Para os contratos de API, payloads e padrões das filas BullMQ.

Fluxo de Controle de Versão (Git)

    Branch Base: Você deve obrigatoriamente criar sua branch de trabalho a partir da branch homologation.

    Pull Requests: Todos os Pull Requests gerados ao final das suas implementações devem ser abertos apontando para a branch homologation como destino (target).
