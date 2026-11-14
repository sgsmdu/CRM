import React, { useMemo, useState } from 'react';
import { useSgs } from '../context/SgsContext';
import { Plus, Check, X, AlertCircle } from 'lucide-react';

export interface MoneyFlowCategorySelection {
  categoryId: string;
  categoryName: string;
  subcategoryId: string;
  subcategoryName: string;
  secondSubcategoryId: string;
  secondSubcategoryName: string;
}

export interface MoneyFlowCategoryPickerProps {
  flowType: 'income' | 'expense';
  categoryId: string;
  subcategoryId: string;
  secondSubcategoryId: string;
  onChange: (next: MoneyFlowCategorySelection) => void;
  isDark: boolean;
}

export const MoneyFlowCategoryPicker: React.FC<MoneyFlowCategoryPickerProps> = ({
  flowType,
  categoryId,
  subcategoryId,
  secondSubcategoryId,
  onChange,
  isDark,
}) => {
  const { moneyFlowCategories, addMoneyFlowCategory } = useSgs();

  const [addingLevel, setAddingLevel] = useState<1 | 2 | 3 | null>(null);
  const [newName, setNewName] = useState('');
  const [inlineError, setInlineError] = useState<string | null>(null);

  const level1Options = useMemo(
    () =>
      moneyFlowCategories
        .filter(
          c =>
            c.level === 1 &&
            c.isActive !== false &&
            (c.type === 'both' || c.type === flowType)
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [moneyFlowCategories, flowType]
  );

  const level2Options = useMemo(
    () =>
      categoryId
        ? moneyFlowCategories
            .filter(c => c.level === 2 && c.parentId === categoryId && c.isActive !== false)
            .sort((a, b) => a.name.localeCompare(b.name))
        : [],
    [moneyFlowCategories, categoryId]
  );

  const level3Options = useMemo(
    () =>
      subcategoryId
        ? moneyFlowCategories
            .filter(c => c.level === 3 && c.parentId === subcategoryId && c.isActive !== false)
            .sort((a, b) => a.name.localeCompare(b.name))
        : [],
    [moneyFlowCategories, subcategoryId]
  );

  const emitChange = (catId: string, subId: string, thirdId: string) => {
    const c1 = moneyFlowCategories.find(c => c.id === catId);
    const c2 = moneyFlowCategories.find(c => c.id === subId);
    const c3 = moneyFlowCategories.find(c => c.id === thirdId);
    onChange({
      categoryId: catId,
      categoryName: c1?.name || '',
      subcategoryId: subId,
      subcategoryName: c2?.name || '',
      secondSubcategoryId: thirdId,
      secondSubcategoryName: c3?.name || '',
    });
  };

  const handleSaveInline = () => {
    if (!addingLevel) return;
    setInlineError(null);
    const parentId =
      addingLevel === 1 ? null : addingLevel === 2 ? categoryId || null : subcategoryId || null;

    if (addingLevel === 2 && !parentId) {
      setInlineError('Select a Category first before adding a Subcategory.');
      return;
    }
    if (addingLevel === 3 && !parentId) {
      setInlineError('Select a Subcategory first before adding a 2nd Subcategory.');
      return;
    }

    const res = addMoneyFlowCategory({
      name: newName,
      level: addingLevel,
      parentId,
      type: flowType,
    });
    if (res.error || !res.category) {
      setInlineError(res.error || 'Could not create category.');
      return;
    }

    const created = res.category;
    if (addingLevel === 1) {
      onChange({
        categoryId: created.id,
        categoryName: created.name,
        subcategoryId: '',
        subcategoryName: '',
        secondSubcategoryId: '',
        secondSubcategoryName: '',
      });
    } else if (addingLevel === 2) {
      const c1 = moneyFlowCategories.find(c => c.id === categoryId);
      onChange({
        categoryId,
        categoryName: c1?.name || '',
        subcategoryId: created.id,
        subcategoryName: created.name,
        secondSubcategoryId: '',
        secondSubcategoryName: '',
      });
    } else {
      const c1 = moneyFlowCategories.find(c => c.id === categoryId);
      const c2 = moneyFlowCategories.find(c => c.id === subcategoryId);
      onChange({
        categoryId,
        categoryName: c1?.name || '',
        subcategoryId,
        subcategoryName: c2?.name || '',
        secondSubcategoryId: created.id,
        secondSubcategoryName: created.name,
      });
    }

    setNewName('');
    setAddingLevel(null);
  };

  const selectClass = `w-full rounded-lg px-3 py-2 text-xs font-medium focus:outline-none ${
    isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
  }`;

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Level 1: Category */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Category *
            </label>
            <button
              type="button"
              onClick={() => {
                setAddingLevel(addingLevel === 1 ? null : 1);
                setNewName('');
                setInlineError(null);
              }}
              className="text-[11px] font-bold text-blue-500 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
          <select
            value={categoryId}
            onChange={(e) => emitChange(e.target.value, '', '')}
            className={selectClass}
          >
            <option value="">-- Select Category --</option>
            {level1Options.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Level 2: Subcategory */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Subcategory
            </label>
            <button
              type="button"
              disabled={!categoryId}
              onClick={() => {
                setAddingLevel(addingLevel === 2 ? null : 2);
                setNewName('');
                setInlineError(null);
              }}
              className="text-[11px] font-bold text-blue-500 hover:underline disabled:opacity-40 flex items-center gap-0.5 cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
          <select
            value={subcategoryId}
            disabled={!categoryId}
            onChange={(e) => emitChange(categoryId, e.target.value, '')}
            className={`${selectClass} disabled:opacity-50`}
          >
            <option value="">{categoryId ? '-- Optional Subcategory --' : 'Select Category first'}</option>
            {level2Options.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Level 3: 2nd Subcategory */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              2nd Subcategory
            </label>
            <button
              type="button"
              disabled={!subcategoryId}
              onClick={() => {
                setAddingLevel(addingLevel === 3 ? null : 3);
                setNewName('');
                setInlineError(null);
              }}
              className="text-[11px] font-bold text-blue-500 hover:underline disabled:opacity-40 flex items-center gap-0.5 cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
          <select
            value={secondSubcategoryId}
            disabled={!subcategoryId}
            onChange={(e) => emitChange(categoryId, subcategoryId, e.target.value)}
            className={`${selectClass} disabled:opacity-50`}
          >
            <option value="">{subcategoryId ? '-- Optional 2nd Subcategory --' : 'Select Subcategory first'}</option>
            {level3Options.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Inline Quick Add Bar */}
      {addingLevel && (
        <div className={`p-2.5 rounded-xl border space-y-2 ${
          isDark ? 'bg-slate-950 border-blue-900/60' : 'bg-blue-50/70 border-blue-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
              Add New {addingLevel === 1 ? 'Level 1 Category' : addingLevel === 2 ? 'Level 2 Subcategory' : 'Level 3 (2nd Subcategory)'}
            </span>
            <button
              type="button"
              onClick={() => {
                setAddingLevel(null);
                setInlineError(null);
              }}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveInline();
                }
              }}
              placeholder={
                addingLevel === 1
                  ? 'e.g. Food Expenses'
                  : addingLevel === 2
                    ? 'e.g. Tea'
                    : 'e.g. Office'
              }
              className={`flex-1 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none ${
                isDark ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
              }`}
            />
            <button
              type="button"
              onClick={handleSaveInline}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" /> Save
            </button>
          </div>
          {inlineError && (
            <p className="text-[11px] font-semibold text-rose-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {inlineError}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
