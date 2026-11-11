import { useEffect, useRef } from 'react';
import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

// Key order independent compare (Firestore returns keys sorted)
const stable = (v: any): string =>
  JSON.stringify(v, (_k, val) =>
    val && typeof val === 'object' && !Array.isArray(val)
      ? Object.keys(val).sort().reduce((o: any, k) => { o[k] = val[k]; return o; }, {})
      : val
  );

// Firestore does not accept undefined fields
const clean = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

const SAVE_DELAY_MS = 600;

/**
 * Keeps an array state (items with `id`) in sync with a Firestore collection.
 * - First load: remote items + local-only items (local-only get uploaded)
 * - After that: Firestore is the source of truth, local edits are written back.
 */
export function useCollectionSync<T extends { id: string }>(
  name: string,
  items: T[],
  setItems: (v: T[]) => void,
  enabled: boolean
) {
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const remote = useRef(new Map<string, string>());
  const ready = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    ready.current = false;
    remote.current = new Map();

    const unsub = onSnapshot(
      collection(db, name),
      (snap) => {
        const list = snap.docs.map(d => ({ ...(d.data() as any), id: d.id }) as T);
        const map = new Map<string, string>();
        list.forEach(i => map.set(i.id, stable(i)));

        if (!ready.current) {
          const localOnly = itemsRef.current.filter(i => i.id && !map.has(i.id));
          remote.current = map;
          ready.current = true;
          setItems([...list, ...localOnly]);
          return;
        }
        remote.current = map;
        // Echo of our own pending write: do not overwrite newer local edits
        if (snap.metadata.hasPendingWrites) return;
        setItems(list);
      },
      (err) => console.warn(`Sync error [${name}]:`, err)
    );

    return () => {
      unsub();
      ready.current = false;
    };
  }, [enabled, name]);

  useEffect(() => {
    if (!enabled || !ready.current) return;
    const t = setTimeout(() => {
      const ids = new Set<string>();
      items.forEach(item => {
        if (!item || !item.id) return;
        ids.add(item.id);
        const s = stable(item);
        if (remote.current.get(item.id) !== s) {
          remote.current.set(item.id, s);
          setDoc(doc(db, name, item.id), clean(item)).catch(e =>
            console.warn(`Save failed [${name}/${item.id}]:`, e)
          );
        }
      });
      Array.from(remote.current.keys()).forEach(id => {
        if (!ids.has(id)) {
          remote.current.delete(id);
          deleteDoc(doc(db, name, id)).catch(e =>
            console.warn(`Delete failed [${name}/${id}]:`, e)
          );
        }
      });
    }, SAVE_DELAY_MS);
    return () => clearTimeout(t);
  }, [items, enabled, name]);
}

/**
 * Keeps a single value (object / array without ids) in sync with doc `settings/<key>`.
 */
export function useDocSync<T>(
  key: string,
  value: T,
  setValue: (v: T) => void,
  enabled: boolean
) {
  const valueRef = useRef(value);
  valueRef.current = value;
  const last = useRef<string | null>(null);
  const ready = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    ready.current = false;
    last.current = null;
    const ref = doc(db, 'settings', key);

    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.metadata.hasPendingWrites) return;
        if (snap.exists()) {
          const remoteVal = snap.data().value as T;
          last.current = stable(remoteVal);
          ready.current = true;
          const local = valueRef.current as any;
          if (remoteVal && typeof remoteVal === 'object' && !Array.isArray(remoteVal) && local && typeof local === 'object') {
            setValue({ ...local, ...(remoteVal as any) });
          } else {
            setValue(remoteVal);
          }
        } else {
          // Nothing in Firestore yet: upload what this device has
          ready.current = true;
          last.current = stable(valueRef.current);
          setDoc(ref, { value: clean(valueRef.current) }).catch(e =>
            console.warn(`Save failed [settings/${key}]:`, e)
          );
        }
      },
      (err) => console.warn(`Sync error [settings/${key}]:`, err)
    );

    return () => {
      unsub();
      ready.current = false;
    };
  }, [enabled, key]);

  useEffect(() => {
    if (!enabled || !ready.current) return;
    const s = stable(value);
    if (s === last.current) return;
    const t = setTimeout(() => {
      last.current = s;
      setDoc(doc(db, 'settings', key), { value: clean(value) }).catch(e =>
        console.warn(`Save failed [settings/${key}]:`, e)
      );
    }, SAVE_DELAY_MS);
    return () => clearTimeout(t);
  }, [value, enabled, key]);
}
