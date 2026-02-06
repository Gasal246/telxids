import { configureStore } from '@reduxjs/toolkit';
import exportCartReducer from './exportCartSlice';

export const store = configureStore({
  reducer: {
    exportCart: exportCartReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
