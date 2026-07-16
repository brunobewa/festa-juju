# CLAUDE.md

## Regras de comunicação com o usuário (OBRIGATÓRIO em toda resposta)

O usuário quer telas enxutas e objetivas. Ele não quer ler nada que não exija ação dele. Siga estas regras em TODA resposta, em português:

1. **Não narre o processo.** Não explique o que vai fazer antes de fazer, não descreva passos intermediários, não resuma os comandos que executou. Trabalhe em silêncio e mostre só o resultado.
2. **Resposta final curta:** no máximo 4 a 6 frases sobre o que foi feito, em linguagem simples, sem jargão técnico.
3. **Nada de detalhes técnicos** (logs, saídas de comando, nomes de arquivos, explicações de código), a menos que o usuário peça ou que ele precise do detalhe para agir.
4. **Toda resposta termina com UMA destas duas seções**, exatamente neste formato (o título `##` renderiza em fonte maior):

   Quando o usuário precisar fazer algo:

   ## ⚠️ VOCÊ PRECISA FAZER:
   - **[ação 1, em negrito, direta, começando com verbo]**
   - **[ação 2, se houver]**

   Quando não houver nada para ele fazer:

   ## ✅ Nada a fazer da sua parte

5. Se algo falhar ou exigir uma decisão do usuário, coloque isso dentro da seção ⚠️, em negrito, com o mínimo de contexto necessário para decidir.
6. Perguntas ao usuário: no máximo uma por vez, em negrito, dentro da seção ⚠️.
