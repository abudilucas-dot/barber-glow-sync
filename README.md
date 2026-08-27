# Barber Hub Pro

Atue como um desenvolvedor Web Full Stack especialista em React e Tailwind CSS. Crie o código completo para um sistema web moderno, responsivo e com tema escuro (Dark Mode luxuoso em tons de preto, cinza-escuro e dourado/amarelo-ouro) para uma Barbearia.

O projeto deve ser modular e conter as seguintes especificações e funcionalidades:

1. Estrutura de Banco de Dados / Armazenamento (IndexedDB ou LocalStorage):

Tabela de Clientes: Nome completo e WhatsApp.

Tabela de Barbeiros: Nome completo, especialidade e número de WhatsApp comercial individual.

Tabela de Agendamentos: ID do cliente, ID do barbeiro, serviço escolhido, data e horário.

2. Interface do Cliente (Página Pública / LinkBio):

Menu Principal:

Botão de destaque: 'Agendar Horário'.

Botões de links externos: Instagram da Barbearia, Localização no Google Maps e Contato do Dono (WhatsApp Comercial da loja).

Tabela visual de preços dos serviços (ex: Corte Masculino, Barba Imperial, Combo).

Horário de funcionamento da loja (ex: Segunda a Sábado, 09h às 19h).

Fluxo de Agendamento Interativo:

Passo 1 (Cadastro/Identificação): Formato rápido solicitando Nome e WhatsApp do cliente antes de prosseguir.

Passo 2 (Escolha do Agendamento):

Seleção do Serviço.

Seleção do Barbeiro (carregado dinamicamente da lista de barbeiros cadastrados).

Seleção do Dia (grade de botões interativos com os próximos 7 dias).

Grade de Horários (botões dinâmicos de 09:00 às 18:00). Se o barbeiro selecionado já tiver um agendamento gravado naquele dia e horário, o botão deve ficar vermelho, com status 'Ocupado' e desabilitado para clique.

Passo 3 (Confirmação e Redirecionamento):

Ao confirmar, o agendamento é salvo no sistema.

O sistema gera um link e abre automaticamente o WhatsApp do barbeiro escolhido com uma mensagem pré-formatada. Exemplo: "Olá [Nome do Barbeiro]! Sou o(a) [Nome do Cliente]. Agendei o serviço [Serviço] para o dia [Data] às [Horário]."

3. Painel de Gestão (Dashboard Administrativo):

Aba de Clientes: Lista de clientes cadastrados com opção de adicionar e excluir.

Aba de Barbeiros: Lista da equipe com Nome, Especialidade e WhatsApp individual, com opção de adicionar e excluir.

Aba de Agendamentos (Agenda Completa): Exibição de todos os horários marcados (Cliente, Barbeiro, Serviço, Data e Hora) com opção de cancelar/excluir o agendamento.

Limpeza Automática: Função que limpa automaticamente do banco de dados qualquer agendamento cuja data já tenha passado.

Por favor, forneça a estrutura completa dos arquivos React (incluindo componentes, gerenciamento de estado e estilos) pronta para rodar via Vite.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c6528e8e-a114-4e0f-9fab-2b5fbe1035d5).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
