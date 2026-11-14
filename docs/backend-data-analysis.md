# Dados reais e arquitetura de consumo

Este é o levantamento inicial das quatro variáveis da API v1. Após a expansão
da base, consultar a [análise das 70 tabelas e contrato de consumo](contrato-dados-api-frontend.md)
e o [contrato de entrega dos pipelines](contrato-pipelines-api.md). Os períodos,
contagens e limitações de disponibilidade abaixo preservam o recorte inicial.

Consulta SQL realizada em 14/11/2026 no workspace GCP 8259554586019913,
warehouse 74a8d94611137690, catálogo `earth-trend-data.refined`.
Nenhum arquivo kipp/serving foi usado como fonte desta análise.

| Variável | Tabela | Linhas | Meses | Cobertura temporal | Valores ausentes |
|---|---|---:|---:|---|---:|
| Ar a 10 m, °C | tb_merra2_t10m | 6.861.888 | 33 | jan/2024–set/2026 | 0 |
| Superfície, °C | tb_merra2_ts | 6.861.888 | 33 | jan/2024–set/2026 | 0 |
| Chuva Final, mm/mês | tb_gpm_imerg_precipitation | 4.366.656 | 21 | jan/2024–set/2025 | 48.444 |
| Chuva Late, mm/mês | tb_gpm_imerg_late_precipitation | 831.744 | 4 | out/2025–jan/2026 | 18.216 |

Total: 18.922.176 registros. A disponibilidade foi medida nas tabelas, não
inferida a partir de arquivos no bucket. Na amostra de um mês de cada tabela,
as 207.936 linhas são únicas na chave (lat, lon, time). A verificação de
unicidade cobre esses meses, não todo o histórico.

## Grade e tamanho

Todas as quatro tabelas têm 361 latitudes e 576 longitudes, de -90 a 90 e de
-180 a 179,375 graus. Passos de 0,5° em latitude e 0,625° em longitude.
Cada mês tem 207.936 posições (361 × 576), não milhões de posições simultâneas.
Um Float32 por posição ocupa 831.744 bytes; valores mais uma máscara Float32
ocupam 1.663.488 bytes antes de compressão. Arrays separados de latitude e
longitude acrescentariam apenas 3.748 bytes.

A chuva tem valid_area_fraction no intervalo observado [0,1]. Preservar null/NaN
como ausência e não como zero. Final e Late têm qualidade e processamento
próprios; não uni-los silenciosamente. Há vento com colunas SPEED_K e SPEED_C,
que exige correção de unidade. Não foi encontrada tabela de vegetação no
schema consultado: NDVI não pode ser apresentado como EVI nem inventado.

## Escolha arquitetural

- Databricks: leitura e agregação de tabelas com predicados de mês e área.
- Cloud Run em us-east4: Node.js 24 / TypeScript / Fastify, API de leitura,
  credencial OAuth própria, cache limitado, coalescência e concorrência limitada.
- Mapa: Float32 + máscara; níveis de detalhe e bbox; respostas sem coordenadas
  repetidas por célula. JSON limitado para inspeção.
- Frontend futuro: textura WebGL/WebGPU ou camada GPU para os campos; manter SVG
  apenas para poucos marcadores/contornos. As camadas SVG atuais não devem receber
  200 mil elementos por mês, muito menos milhões de elementos.
- Gráfico: consultas regionais pequenas e separadas dos quadros do globo.
- Lakebase futuro: mesmo contrato HTTP, adaptador PostgreSQL, pool e TLS;
  migrar tabelas/credenciais e atualizar configuração da API.

Rust não é necessário para servir esses quadros já preparados. Caso seja
necessário reprojetar rasters de alta resolução ou gerar tiles pesados em tempo
real, esse processamento deve ser avaliado separadamente. A implementação atual
retorna uma grade agregada de visualização; análises regionais usam a grade de
origem e registram que a seleção espacial é um bbox, não o polígono de uma bacia.

A grade de exibição agrupa centros de amostra em células geográficas. Os polos
são incluídos nos bins de borda. A média usa cos(latitude) e cobertura válida:
é uma aproximação documentada para visualização e exploração, não uma análise
científica validada de áreas exatas. Não há anomalias climatológicas ou previsão.

## Comparação e eventos

Começar com dois globos, compartilhando câmera e escala de cores quando a
variável e a unidade forem iguais. Cada lado escolhe seu mês, produto e área.
Mostrar unidade, produto, mês e cobertura em ambos. A comparação deve respeitar
a disponibilidade de cada variável: não preencher meses ausentes nem tratar
Late como extensão indistinguível de Final. Dois globos nativos usam cerca de
3,2 MiB de valores e cobertura antes de compressão; a superfície atual já usa WebGL, mas as camadas de dados
ainda são SVG. O gargalo do protótipo seria
criar centenas de milhares de elementos SVG, não esse volume de arrays.

Um preset de evento precisa de nome, fonte, período e geometria (ponto,
trajetória ou área). Ele reposiciona a câmera, seleciona o período e desenha uma
camada independente sobre o campo climático. Não precisa duplicar todas as
variáveis do evento: a API consulta os dados existentes naquele lugar e período.
Uma data sozinha seleciona o mês, mas não localiza o fenômeno.

O histórico disponível começa em 2024 e é mensal. Eventos anteriores ficam
sem campo climático disponível; eventos de curta duração podem desaparecer na
média mensal. Estes dados não fornecem, por si, focos de queimadas, trajetórias
de furacões, altura de ondas de tsunami ou um índice de El Niño. Essas camadas
exigem fontes específicas e resoluções temporais adequadas. Sem uma série
climatológica maior e validação de método, a interface pode comparar os valores
observados; não deve atribuir semelhança a uma previsão ou detecção de fenômeno.

## Validação da API com a fonte real

Foram consultados catálogo, recorte de chuva, série regional de temperatura,
grade global binária e área atravessando o antimeridiano. Um ruído numérico na
longitude próxima de zero (-5,97e-13°) provocava uma coluna vazia ao aplicar
floor. Os bins passaram a tolerar desvios de até 1e-9 de célula na fronteira.
Isso preserva a continuidade da grade de exibição sem interpolar valores.

Medições locais pontuais, com warehouse ativo: um recorte de chuva respondeu em
2,3 s, uma série de três meses em 1,7 s e uma resposta já em cache em 2 ms.
São verificações funcionais, não um teste de carga ou promessa de latência em
produção. A implantação pública foi concluída com a conta administradora do hackathon;
as concessões estão descritas em backend-cloud-run-access.md.

Após a correção, o quadro global de temperatura jan/2024 retornou 576 × 360
células de exibição, todas válidas, em 1.660.004 bytes incluindo metadados.
A diferença para 361 linhas da origem decorre do agrupamento das bordas polares.

Na URL pública, o catálogo retornou HTTP 200 em 3,0 s e o recorte de chuva
HTTP 200 em 1,8 s, usando credenciais dedicadas e dados reais do Databricks.
