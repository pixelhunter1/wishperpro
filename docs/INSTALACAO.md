# WishperPro - Guia de Instalação e Uso

## Requisitos do Sistema

### Software Necessário
- **Node.js**: versão 18 ou superior
- **npm**: versão 9 ou superior
- **Sistema Operativo**: macOS, Windows ou Linux

### Conta OpenAI
- Conta ativa na OpenAI Platform
- API Key com acesso aos modelos:
  - `whisper-1` (transcrição de áudio)
  - `gpt-4-turbo-preview` (processamento de texto)
- Créditos disponíveis na conta

**Obter API Key**: https://platform.openai.com/api-keys

---

## Instalação

### 1. Clonar o Repositório

```bash
git clone <url-do-repositorio>
cd wishperpro
```

### 2. Instalar Dependências

```bash
npm install
```

Este comando irá instalar todas as dependências necessárias:
- Electron e electron-builder
- React, TypeScript, Vite
- OpenAI SDK
- better-sqlite3
- shadcn/ui components
- Tailwind CSS

### 3. Verificar Instalação

```bash
npm run lint
```

Se não houver erros, a instalação foi bem-sucedida.

---

## Desenvolvimento

### Executar em Modo de Desenvolvimento

```bash
npm run dev
```

Este comando:
1. Inicia o servidor de desenvolvimento Vite
2. Compila o processo main do Electron
3. Abre a aplicação Electron com hot-reload ativado

**Nota**: Alterações nos ficheiros são automaticamente recarregadas.

---

## Configuração Inicial

### 1. Obter API Key da OpenAI

1. Aceda a https://platform.openai.com/api-keys
2. Faça login na sua conta OpenAI
3. Clique em "Create new secret key"
4. Copie a chave (começa com `sk-...`)

**⚠️ IMPORTANTE**: Guarde a chave num local seguro. Não será possível vê-la novamente.

### 2. Configurar a Aplicação

1. Abra a aplicação WishperPro
2. Vá para o separador **"Configurações"**
3. Cole a API Key no campo "OpenAI API Key"
4. Clique em **"Guardar"**
5. Escolha o modo:
   - **"Apenas Corrigir Português"**: para correção gramatical
   - **"Traduzir para Outro Idioma"**: para tradução
6. Se escolher tradução, selecione o idioma de destino

**A configuração está completa!** 🎉

---

## Como Usar

### Gravar e Transcrever Áudio

#### No Separador "Gravar":

1. **Pressione e mantenha** o botão circular grande
2. **Fale** enquanto mantém o botão pressionado
3. **Solte** o botão quando terminar de falar

#### O que acontece:

1. **Gravação**: Indicador vermelho a piscar
2. **Processamento**: Indicador amarelo a rodar
   - Transcrição do áudio (Whisper)
   - Correção/Tradução (GPT-4)
3. **Resultado**: Texto final aparece no ecrã

#### Copiar Texto:

1. Clique no botão **"Copiar"**
2. O texto é copiado para a área de transferência
3. Cole onde quiser com `Ctrl+V` / `Cmd+V`

---

### Ver Histórico

#### No Separador "Histórico":

- Lista de todas as transcrições anteriores
- Informação mostrada:
  - Data e hora
  - Texto original (transcrito)
  - Texto processado (corrigido/traduzido)
  - Modo e idioma usados

#### Copiar do Histórico:

- Clique em **"Copiar"** em qualquer registo
- O texto processado é copiado para a área de transferência

---

### Alterar Configurações

#### No Separador "Configurações":

**Mudar API Key**:
- Insira nova chave e clique em "Guardar"

**Mudar Modo**:
- "Apenas Corrigir Português": texto permanece em PT
- "Traduzir para Outro Idioma": texto é traduzido

**Mudar Idioma de Destino** (apenas em modo tradução):
- Inglês
- Espanhol
- Francês
- Alemão
- Italiano

---

## Build para Produção

### Build Completo (com instalador)

```bash
npm run build
```

Este comando:
1. Compila TypeScript
2. Faz build do Vite (renderer)
3. Faz build do Electron (main process)
4. Cria instaladores para o seu sistema

**Saída**: pasta `release/` com instaladores:
- **macOS**: `.dmg` e `.zip`
- **Windows**: `.exe` (NSIS) e `.exe` (Portable)
- **Linux**: `.AppImage` e `.deb`

### Build Apenas Diretório (sem instalador)

```bash
npm run build:dir
```

Mais rápido, útil para testes. Saída: pasta `release/` com app sem empacotar.

---

## Estrutura de Dados

### Localização da Base de Dados

A base de dados SQLite é criada automaticamente em:

- **macOS**: `~/Library/Application Support/WishperPro/wishperpro.db`
- **Windows**: `%APPDATA%\WishperPro\wishperpro.db`
- **Linux**: `~/.config/WishperPro/wishperpro.db`

### O Que É Guardado

1. **API Key**: Encriptada localmente
2. **Histórico de Transcrições**:
   - Data e hora
   - Texto original
   - Texto processado
   - Idioma e modo

**Privacidade**: Todos os dados são armazenados apenas localmente. Nada é enviado para servidores externos exceto para a OpenAI API durante o processamento.

---

## Resolução de Problemas

### Erro: "API Key not configured"

**Solução**:
1. Vá para "Configurações"
2. Insira uma API Key válida da OpenAI
3. Clique em "Guardar"

### Erro: "Erro ao aceder ao microfone"

**Solução**:
1. Verifique permissões do sistema para o microfone
2. **macOS**: System Preferences > Security & Privacy > Microphone
3. **Windows**: Settings > Privacy > Microphone
4. Reinicie a aplicação

### Erro: Transcrição falha

**Possíveis causas**:
- API Key inválida ou sem créditos
- Áudio muito curto (grave pelo menos 1 segundo)
- Sem conexão à internet

**Solução**:
1. Verifique saldo de créditos OpenAI
2. Teste conexão à internet
3. Tente gravar áudio mais longo

### Build falha no macOS

Se houver erro ao compilar `better-sqlite3`:

```bash
# Instalar ferramentas de build
xcode-select --install

# Reinstalar dependências
rm -rf node_modules
npm install
```

### Build falha no Windows

Se houver erro ao compilar `better-sqlite3`:

1. Instale Visual Studio Build Tools
2. Reinstale:
   ```bash
   rmdir /s node_modules
   npm install
   ```

---

## Custos da OpenAI

### Preços Aproximados (Jan 2024)

**Whisper API**:
- $0.006 por minuto de áudio
- Exemplo: 10 minutos = $0.06

**GPT-4 Turbo**:
- Input: $0.01 por 1K tokens
- Output: $0.03 por 1K tokens
- Exemplo: 1000 palavras ≈ $0.05

**Total estimado**: $0.10 por 10 minutos de transcrição + processamento

Para uso moderado (1 hora/mês), custo estimado: **~$0.60/mês**

---

## Atalhos de Teclado

Atualmente não há atalhos globais. Melhorias futuras incluirão:
- Hotkey global para iniciar gravação
- Atalhos para navegação entre separadores

---

## Suporte e Contribuições

### Reportar Bugs

Abra uma issue no GitHub com:
- Descrição do problema
- Passos para reproduzir
- Sistema operativo e versão
- Logs de erro (se disponíveis)

### Contribuir

1. Fork do repositório
2. Crie branch para feature (`git checkout -b feature/AmazingFeature`)
3. Commit das alterações (`git commit -m 'Add AmazingFeature'`)
4. Push para branch (`git push origin feature/AmazingFeature`)
5. Abra Pull Request

---

## Licença

[Inserir informação de licença]

---

## Contacto

[Inserir informação de contacto]

---

## FAQ

### Posso usar sem conexão à internet?

Não. A aplicação requer conexão à internet para comunicar com a OpenAI API.

### Os dados são partilhados com terceiros?

Apenas com a OpenAI durante processamento de áudio e texto. Nada é armazenado em servidores externos.

### Posso usar outras APIs de transcrição?

Atualmente apenas OpenAI Whisper é suportado. Contribuições para suportar outras APIs são bem-vindas.

### Qual é o tamanho máximo de áudio?

OpenAI Whisper aceita ficheiros até 25 MB. Para gravações longas, recomenda-se gravar em segmentos menores.

### Posso exportar o histórico?

Atualmente não. Feature planeada para versão futura.

---

**Bom uso! 🎤✨**
