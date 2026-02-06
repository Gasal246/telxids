import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface GenerateGroup {
  id: string;
  model_number: string;
  telx_model_number: string;
  category_name: string;
  region_id: string;
  suffix: string;
  generated_at: string;
  serials: Array<{
    serialNumber: string;
    macIds: string[];
  }>;
}

interface ExportCartState {
  groups: GenerateGroup[];
}

const initialState: ExportCartState = {
  groups: [],
};

const exportCartSlice = createSlice({
  name: 'exportCart',
  initialState,
  reducers: {
    addGroupToCart: (state, action: PayloadAction<GenerateGroup>) => {
      const exists = state.groups.find(g => g.id === action.payload.id);
      if (!exists) {
        state.groups.push(action.payload);
      }
    },
    removeGroupFromCart: (state, action: PayloadAction<string>) => {
      state.groups = state.groups.filter(g => g.id !== action.payload);
    },
    clearCart: (state) => {
      state.groups = [];
    },
  },
});

export const { addGroupToCart, removeGroupFromCart, clearCart } = exportCartSlice.actions;
export default exportCartSlice.reducer;
