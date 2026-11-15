# Vento mensal no globo

Implementação local de 15/11/2026, assistida por OpenAI Codex a pedido do usuário.

## Disponibilidade verificada

Consultas somente de leitura no workspace ativo
`8259554586019913.3.gcp.databricks.com`, Warehouse `74a8d94611137690`,
confirmaram 12 tabelas `earth-trend-data.trusted.tb_merra2_{u,v}<nível>`.
Cada uma contém `time` DATE, `latitude`, `longitude` e a componente em m/s.
Não há necessidade de uma coluna de ângulo pronta: U é a componente para leste;
V, para norte. Ambos os valores são necessários para a direção horizontal.

| Nível | IDs da API | Período global verificado | Meses por componente |
| --- | --- | --- | --- |
| 10 m | `merra2_u10m`, `merra2_v10m` | jan/2000–set/2026 | 321 |
| 850 hPa | `merra2_u850`, `merra2_v850` | jan/2000–set/2026 | 321 |
| 2 m | `merra2_u2m`, `merra2_v2m` | jan/2024–set/2026 | 33 |
| 50 m | `merra2_u50m`, `merra2_v50m` | jan/2024–set/2026 | 33 |
| 250 hPa | `merra2_u250`, `merra2_v250` | jan/2024–set/2026 | 33 |
| 500 hPa | `merra2_u500`, `merra2_v500` | jan/2024–set/2026 | 33 |

Identificadores das consultas executadas:

- Esquemas das 12 tabelas, 48 colunas: `01f1e0b5-7377-1ec2-bafc-9727a9c14f3f`.
- U/V pareados por tempo/latitude/longitude a 10 m:
  `01f1e0b5-7378-1123-9d39-4ec0eedc5bba`.
- Contagens e cobertura de todas as componentes:
  `01f1e0b5-a088-1a98-a433-35765706580b`.

A consulta pareada retornou, por exemplo, em 01/09/2026, latitude −24°,
longitude −47,5°: U = −0,43329215 m/s e V = 0,26077998 m/s;
norma resultante = 0,5057156169 m/s. Exemplo técnico de leitura, sem inferência
de tendência, significância ou causalidade. As tabelas de 850 hPa contêm
valores ausentes, que continuam ausentes na visualização.

Consulta reproduzível de exemplo, usando os nomes físicos trusted:

```sql
SELECT u.time, u.latitude, u.longitude,
  u.eastward_wind_at_10_meters_meters_per_second AS u,
  v.northward_wind_at_10_meters_meters_per_second AS v
FROM `earth-trend-data`.trusted.tb_merra2_u10m u
JOIN `earth-trend-data`.trusted.tb_merra2_v10m v
  USING (time, latitude, longitude)
WHERE u.time = DATE '2026-09-01'
  AND u.latitude = -24 AND u.longitude = -47.5;

SELECT min(time), max(time), count(DISTINCT time), count(*)
FROM `earth-trend-data`.trusted.tb_merra2_u10m;
```

O catálogo público foi conferido separadamente e contém as 12 componentes,
produto `MERRA-2 M2TMNXSLV 5.12.4`, unidade m/s e fator de exibição 2.
A tabela antiga `tb_merra2_speed` continua excluída: sua conversão incorreta
Kelvin/Celsius não foi usada para inferir velocidade ou direção.

## Comportamento e método

Selecionar qualquer componente de vento em Variables ativa setas no lugar de
sua camada escalar. O seletor identifica essas variáveis com “paired wind
arrows”. A componente complementar do mesmo nível é carregada automaticamente,
sem entrar nos gráficos ou modificar a seleção. São usados os endpoints e a
fila/cache limitada já existentes; não há novo backend nem alteração no banco.

As duas componentes entram no mesmo lote de frames, inclusive na preparação
do playback. O último mês coerente permanece visível durante o carregamento.
Só se formam vetores com o mesmo mês, nível, produto, run, unidade, orientação,
dimensões e limites da grade. Cada célula exige valores finitos e cobertura
positiva em U e V. Falhas da componente complementar aparecem no cartão e
podem ser repetidas com Retry. Não se inventa componente ou direção ausente.

Para as médias mensais de cada célula de exibição:

- Intensidade resultante: `hypot(U, V)`, em m/s.
- Direção **para onde** sopra: `(atan2(U, V) × 180/π + 360) % 360`, a partir do
  norte, no sentido horário. U positivo aponta a leste; V positivo, a norte.
- Norma menor que `1e-6 m/s`: não desenhar seta; direção indefinida no probe.

Esta direção “toward” é oposta à convenção meteorológica de informar **de onde**
sopra. As setas usam a tangente geográfica leste/norte projetada na câmera
ortográfica, acompanhando rotação, inclinação e zoom. O verso e a borda extrema
do globo são omitidos. A amostragem visual é limitada em espaço de tela e as
setas ficam nos centros das células existentes, sem interpolar ângulos ou criar
uma resolução científica maior.

O comprimento é fixo, sem codificar velocidade. A cor, escala personalizada e
filtro de faixa seguem a componente assinada selecionada, em m/s; os gráficos
continuam representando essa componente. Setas sobrepõem camadas escalares.
Se U e V do mesmo nível estiverem visíveis, há um único campo de setas e a
última componente visível controla cor/opacidade, como informado nos controles.
Visibilidade e opacidade zero removem as setas. O probe de uma camada única
informa direção, U, V e intensidade resultante; campos sem par são explícitos.

MERRA-2 é uma **reanálise**, e estes dados são médias mensais. A norma das
médias das componentes não equivale à média mensal das velocidades. Não
representa rajadas, observação instantânea, trajetória de tempestade ou previsão.
Os frames atuais agregam cada componente separadamente por latitude e cobertura;
a combinação ocorre nas células de exibição válidas em ambas. A camada vetorial
apoia a exploração, sem substituir série temporal, taxa ou significância.

Referências primárias consultadas em 15/11/2026:
[NASA/GMAO — MERRA-2 e U10M/V10M](https://gmao.gsfc.nasa.gov/gmao-products/merra-2/wmo-data-access_merra-2/),
[NASA — produto mensal M2TMNXSLV](https://data.nasa.gov/dataset/merra-2-tavgm-2d-slv-nx-2dmonthly-meantime-averagedsingle-levelassimilationsingle-level-di-892ac),
[UCAR — componentes e convenção de direção](https://www.eol.ucar.edu/content/wind-direction-quick-reference).

Nenhuma imagem ou dado científico foi gerado por IA para esta funcionalidade.
Código, testes e documentação receberam assistência de OpenAI Codex. Mantêm-se
os créditos do basemap e das bibliotecas existentes. Investigação científica,
revisão humana, publicação e submissão Space Apps são verificações separadas.

## Validação

Node.js 24: 57 testes frontend aprovados e builds frontend/backend aprovados.
Os testes novos verificam dependência no mesmo nível, ausência de mês/componente,
incompatibilidade de produto/grade/run/unidade, direções cardeais, dados ausentes,
calmaria e projeção. A orientação é comparada numericamente à projeção d3 em
câmeras inclinadas, no antimeridiano e em zooms de 0,8× a 8×.

Preview local em `http://localhost:5186`, usando a API pública existente e dados
reais. Chromium confirmou carregamento automático de U10/V10 e 203 setas na
câmera inicial de desktop, com leitura de direção/resultante pelo probe.
Verificações adicionais dos controles e mobile são registradas no checklist.
