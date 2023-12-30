import { legacy_createStore as createStore } from 'redux';
import { persistReducer, persistStore, } from 'redux-persist';
import { describe, expect, it } from 'vitest';
import { encryptTransform } from '../sync.js';
const inMemoryStorage = () => {
    const memory = new Map();
    const storage = {
        getItem: key => new Promise(resolve => {
            resolve(memory.get(key));
        }),
        setItem: (key, item) => new Promise(resolve => {
            memory.set(key, item);
            resolve();
        }),
        removeItem: key => new Promise(resolve => {
            memory.delete(key);
            resolve();
        }),
    };
    return { storage, memory };
};
const persistStoreAsync = (store) => new Promise(resolve => {
    const persistor = persistStore(store, void 0, () => resolve(persistor));
});
describe('end-to-end', () => {
    it('works with `redux-persist`', async () => {
        const counter = (state = { count: 0 }, action) => {
            switch (action.type) {
                case 'INCREMENT':
                    return { ...state, count: state.count + 1 };
                case 'DECREMENT':
                    return { ...state, count: state.count - 1 };
                default:
                    return state;
            }
        };
        const { storage } = inMemoryStorage();
        const transform = encryptTransform({
            secretKey: 'e2e-test',
        });
        const key = 'counter';
        const persistedCounter = persistReducer({
            key,
            storage,
            transforms: [transform],
        }, counter);
        const store = createStore(persistedCounter);
        const persistor = await persistStoreAsync(store);
        store.dispatch({ type: 'INCREMENT' });
        store.dispatch({ type: 'INCREMENT' });
        await persistor.flush();
        const rehydratedStore = createStore(persistedCounter);
        await persistStoreAsync(rehydratedStore);
        expect(rehydratedStore.getState()).toStrictEqual(store.getState());
    });
});
