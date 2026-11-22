/**
 * One-Time-Off GAS Official Returns V2 — additive source adapter.
 *
 * Requires manual integration into the EXISTING deployed Apps Script after
 * inspection of the actual full project. Adds NO doGet()/doPost() and performs
 * NO financial writes. Do not replace original bootstrap/version/content
 * handlers. Update those handlers to call otoReturnsPayload_() when the
 * original response expects the financial payload; preserve its envelope.
 *
 * Source: four 2026-11-22 AIA One-Time-Off cash-withdrawal illustrations,
 * Sheet data normalized by illustrated premium HK$300,001, plus preserved
 * existing rollover tab.
 */
var OTO_RETURNS_SPREADSHEET_ID_='1-QG1tnH0iTYLAzweJ6Gvj5JDN5p1YKIq9IONyvVIo4U';
var OTO_RETURNS_TABS_=[
 {id:'year5',sheet:'5year 6%',rate:0.06,startYear:5,rows:36},
 {id:'year7',sheet:'7year 6.5%',rate:0.065,startYear:7,rows:36},
 {id:'year9',sheet:'9year 7%',rate:0.07,startYear:9,rows:36},
 {id:'year11',sheet:'11year 8%',rate:0.08,startYear:11,rows:36},
 {id:'rollover',sheet:'自動滾存',rate:0,startYear:null,rows:24}
];
function otoReturnsPayload_(){
 var book=SpreadsheetApp.openById(OTO_RETURNS_SPREADSHEET_ID_);
 var plans=OTO_RETURNS_TABS_.map(function(meta){
  var sh=book.getSheetByName(meta.sheet);
  if(!sh)throw new Error('Missing expected Official tab');
  var values=sh.getDataRange().getValues();
  if(!values.length || values[0].slice(0,3).join('|')!=='保單年度|每年提取百分比|結餘倍數')
    throw new Error('Official returns headers invalid');
  var rows=values.slice(1).filter(function(row){return row.slice(0,3).some(function(v){return v!=='';});});
  if(rows.length!==meta.rows)throw new Error('Official returns row count invalid');
  var last=0,expectedYears=[];
  if(meta.id==='rollover')expectedYears=[5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,25,30,35,40,45,50,55,60];
  else {for(var y=1;y<=20;y++)expectedYears.push(y);for(var y2=25;y2<=100;y2+=5)expectedYears.push(y2);}
  var balances=rows.map(function(row,i){
    var year=row[0],rate=row[1],multiple=row[2];
    if(typeof year!=='number'||year!==expectedYears[i]||year<=last ||
       typeof rate!=='number'||Math.abs(rate-meta.rate)>0.00000001||
       typeof multiple!=='number'||!isFinite(multiple)||multiple<=0)
      throw new Error('Official returns data invalid');
    last=year;
    return [year,multiple];
  });
  return {id:meta.id,sheet:meta.sheet,rate:meta.rate,startYear:meta.startYear,balances:balances};
 });
 return {sourceSpreadsheetId:OTO_RETURNS_SPREADSHEET_ID_,plans:plans};
}
function otoReturnsRevision_(payload){
 var bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
   JSON.stringify(payload),Utilities.Charset.UTF_8);
 return bytes.map(function(b){return ('0'+(b&255).toString(16)).slice(-2);}).join('');
}
// Integration sketch for existing doGet route, NOT a replacement:
// if(action==='financial'){
//   const financial = otoReturnsPayload_();
//   return EXISTING_JSON_FUNCTION({schemaVersion:1,
//     revision:otoReturnsRevision_(financial),
//     publishedAt:new Date().toISOString(), data:financial});
// }
// Existing bootstrap must use the SAME financial payload and revision
// as its financial action; existing version must report that revision.
// Must be reconciled with deployed GAS's actual response schema first.
