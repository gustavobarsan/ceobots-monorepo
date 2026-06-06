# Diretrizes Globais do Agente

Toda a arquitetura e especificações (SDD) deste sistema estão documentadas na raiz do projeto.
Sempre que for gerar um código ou iniciar uma nova sessão, você deve basear a implementação estritamente nestes dois arquivos:
- `/arquitetura.md` -> Para regras do monorepo NestJS, isolamento de infraestrutura, Docker e restrições dos RPAs.
- `/sdd_specs.md` -> Para os contratos de API, payloads e padrões das filas BullMQ.
