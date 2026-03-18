import * as mock from './mock/pto';
import * as http from './http/pto';
import { getAppMode } from '../contexts/AppModeContext';

const getImpl = () => (getAppMode() === 'demo' ? mock : http);

export const getPTOEntries: typeof mock.getPTOEntries = (...args) => getImpl().getPTOEntries(...args);
export const getPTOConfig: typeof mock.getPTOConfig = (...args) => getImpl().getPTOConfig(...args);
export const createPTOEntry: typeof mock.createPTOEntry = (...args) => getImpl().createPTOEntry(...args);
export const updatePTOEntry: typeof mock.updatePTOEntry = (...args) => getImpl().updatePTOEntry(...args);
export const deletePTOEntry: typeof mock.deletePTOEntry = (...args) => getImpl().deletePTOEntry(...args);
export const restorePTOEntry: typeof mock.restorePTOEntry = (...args) => getImpl().restorePTOEntry(...args);
export const updatePTOConfig: typeof mock.updatePTOConfig = (...args) => getImpl().updatePTOConfig(...args);
export const seedPTOEntries: typeof mock.seedPTOEntries = (...args) => getImpl().seedPTOEntries(...args);
