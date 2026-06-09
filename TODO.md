Documento de Especificação Técnica e Funcional: Expansão Bolão da Copa (V2) - Arquitetura Firebase Direta

# 1. Visão Geral e Arquitetura de Acesso
O sistema evolui de um gerador estático de arquivos para uma plataforma persistente de múltiplos bolões. A aplicação é totalmente serverless (Single Page Application desenvolvida com React e Vite, conectando-se diretamente ao Firebase).
A home (Simulador Local) se mantém como está e as novas funcionalidades de Ligas Online e Painel de Admin serão extras integrados ao ecossistema.
O modelo de acesso elimina o login tradicional (e-mail e senha globais), utilizando uma abordagem híbrida:
Identificação e Visibilidade: URLs públicas baseadas em hashes únicos de alta entropia (gerados no frontend como tokens alfanuméricos) para ligas e participantes. Qualquer pessoa com o link pode visualizar os dados da liga e do participante.
Integridade e Autenticação de Escrita: Proteção baseada em segredos específicos:
- Criação de Liga: Restrita por código de criador validado contra a variável de ambiente VITE_CREATOR_CODE.
- Edição de Palpite: Restrita por senha individual definida pelo usuário no momento da inscrição (salva criptografada como SHA-256 no Firebase Realtime Database).
- Lançamento de Resultados (Admin): Restrita por uma chave estática de 25 caracteres validada contra a variável de ambiente VITE_ADMIN_KEY.

# 2. Especificação Detalhada das Rotas e Regras de Negócio

### Feature 1: Criação de Liga (/league/new/)
Interface com formulário restrito para que organizadores criem uma nova liga isolada.
Controle de Acesso: Exige o preenchimento do campo "Código de Criador". O frontend valida este valor contra a variável de ambiente VITE_CREATOR_CODE antes de registrar no Firebase Realtime Database.
Campos do Formulário:
- Nome da Liga (ex: "Bolão da Firma 2026")
- Nome do Criador
- E-mail do Criador
- Configuração do Sistema de Pontuação (Dinâmico): Pontos por Acerto do Placar Exato, Acerto de Vencedor + Saldo de Gols, e Acerto Simples de Vencedor ou Empate.
Comportamento do Sistema:
1. Valida o Código de Criador e a integridade das pontuações configuradas.
2. Persiste a liga no Firebase Realtime Database e gera um league_hash único e imprevisível.
3. Exibe a tela de sucesso com o link público da liga.

### Feature 2: Detalhe da Liga (/league/<league_hash>/)
Dashboard público da liga. Exibe a classificação geral e centraliza as ações dos membros.
Componentes da Interface:
- Cabeçalho com metadados da liga (Nome, criador e regras de pontuação vigentes naquela liga).
- Botão de chamada para ação: "Participar do Bolão / Inserir Palpites" (redireciona para /league/<league_hash>/fill/), visível e ativo apenas se a data atual for anterior à trava de encerramento (11 de junho às 14:00 BRT).
- Tabela de Classificação dos Participantes (Posição, Apelido, Pontuação Total). O apelido é um hiperlink para a rota do participante. A classificação é calculada dinamicamente no frontend ao carregar a página com base nos resultados oficiais.
- Seção Extra (Próximos Jogos & Palpites): Exibe os próximos 3 jogos (primeiros 3 sem resultado oficial) e uma matriz simplificada mostrando o palpite de cada participante para essas partidas.

### Feature 3: Criação de Palpites (/league/<league_hash>/fill/)
Formulário de inscrição de novos palpites na liga. O escopo das partidas é restrito estritamente à Fase de Grupos.
Trava Temporal de Segurança: O sistema rejeita novas submissões se a requisição ocorrer após o dia 11 de junho às 14:00 (Horário de Brasília).
Campos do Formulário:
- Nome Completo e Apelido.
- Senha de Edição: Campo do tipo password, obrigatório.
- Grid com todos os jogos da Fase de Grupos (reutilizando visual de simulação local).
Comportamento do Sistema:
1. Cria o registro do participante vinculado ao league_hash no Firebase Realtime Database.
2. Criptografa (aplica hash SHA-256) na senha informada antes de enviar ao Firebase Realtime Database.
3. Gera um participant_hash único.
4. Redireciona o usuário para sua URL individual.

### Feature 4: Detalhe do Participante (/league/<league_hash>/<participant_hash>)
Tela de visualização pública dos palpites de um determinado participante.
Mecanismo de Edição:
- Botão "Editar Meus Palpites", ativo se a data/hora atual for inferior ao limite (11 de junho às 14:00 BRT).
- Ao clicar, o sistema solicita a Senha de Edição. O frontend aplica o hash SHA-256 na entrada e compara com a senha armazenada. Se correto, os campos tornam-se editáveis.
- O participante edita os placares e salva diretamente no Firebase Realtime Database.

### Feature 5: Painel de Administração de Resultados (/admin/)
Área administrativa restrita para a inserção e gerenciamento dos placares oficiais da Copa do Mundo.
Controle de Acesso:
- Formulário de login de campo único para a Chave de Admin estática de 25 caracteres.
- O frontend valida contra a variável de ambiente VITE_ADMIN_KEY e armazena temporariamente no sessionStorage do navegador.
Comportamento do Sistema:
1. O administrador visualiza os jogos da Fase de Grupos.
2. Insere os placares oficiais e clica em "Confirmar Resultado".
3. O frontend salva os placares em um caminho global (admin/results) no Firebase Realtime Database.
4. Ao carregar as páginas das ligas, as pontuações e classificações de todos os participantes são recalculadas dinamicamente em tempo real no cliente com base nesses resultados oficiais.

# 3. Considerações Técnicas Importantes
- Fuso Horário: Todas as validações temporais são baseadas na data UTC equivalente ao limite de 11 de Junho de 2026 às 17:00 UTC (14:00 Horário de Brasília), prevenindo manipulação por alteração de relógio do usuário.
- Hashing de Senhas: As senhas dos palpites são armazenadas em formato de hash SHA-256 no banco de dados Firebase Realtime Database, nunca em texto plano.
- Segurança no Firebase: O acesso e a escrita direta no Realtime Database podem ser protegidos por Security Rules que comparam o hash da senha enviado com o hash persistido.
- Modo de Teste Local (Fallback): O sistema detecta a ausência de chaves do Firebase nas variáveis de ambiente e ativa automaticamente um modo Mock com LocalStorage, mantendo a aplicação 100% testável localmente de forma autônoma.
