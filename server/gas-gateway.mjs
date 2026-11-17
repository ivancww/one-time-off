import {createDocumentedGasReader} from './gas-actions.mjs';
import {gasOfficialReadHandler} from './gas-contract.mjs';
import {mapFinancial,mapContent,validateBootstrap} from './gas-mappers.mjs';
import {createGasTransport} from './gas-transport.mjs';
// Host must supply an actual caller authorization function. No listener or
// deployment is created by this module.
export function createOfficialGasHandler({authorize,fetcher,now}={}){
 if(typeof authorize!=='function')throw Error('Caller authorization required');
 const getAction=createGasTransport({fetcher});
 const read=createDocumentedGasReader({getAction,mapFinancial,mapContent,validateBootstrap,now});
 return gasOfficialReadHandler({authorize,read});
}
