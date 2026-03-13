import * as mock from './mock/pto';
import * as http from './http/pto';

const impl = import.meta.env.VITE_API_URL ? http : mock;

export const getPTOEntries = impl.getPTOEntries;
export const getPTOConfig = impl.getPTOConfig;
export const createPTOEntry = impl.createPTOEntry;
export const updatePTOEntry = impl.updatePTOEntry;
export const deletePTOEntry = impl.deletePTOEntry;
export const restorePTOEntry = impl.restorePTOEntry;
export const updatePTOConfig = impl.updatePTOConfig;
export const seedPTOEntries = impl.seedPTOEntries;
