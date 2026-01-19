---
description: Patrones de UI - Modals, Drawers, Confirmaciones y Forms
---

# Patrones de UI

Este workflow documenta cómo crear y usar Modals, Drawers, Confirmaciones y Forms en la aplicación.

---

## Componentes Base (NO modificar)

| Componente | Ubicación | Uso |
|------------|-----------|-----|
| `Dialog` | `@/components/ui/dialog` | Modal base con header/animaciones |
| `RightDrawer` | `@/components/ui/right-drawer` | Drawer lateral responsive |
| `useConfirm` | `@/components/ui/confirm-modal` | Hook para confirmaciones |

---

## 1. Crear un Modal de Form

// turbo

### Paso 1: Crear archivo en `features/[feature]/[entity]-form-modal.tsx`

```tsx
"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    initialData?: Entity | null; // null = crear, object = editar
}

export function EntityFormModal({ isOpen, onClose, onSuccess, initialData }: Props) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: initialData?.name || "",
        // ... otros campos
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Llamar API...
        setLoading(false);
        onSuccess?.();
        onClose();
    };

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title={initialData ? "Editar" : "Crear Nuevo"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Campos del form */}
                <input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                />
                
                <div className="flex gap-3 pt-4">
                    <button type="button" onClick={onClose} className="flex-1 py-2 border rounded-xl">
                        Cancelar
                    </button>
                    <button type="submit" disabled={loading} className="flex-1 py-2 bg-primary text-white rounded-xl">
                        {loading ? <Loader2 className="animate-spin mx-auto" /> : "Guardar"}
                    </button>
                </div>
            </form>
        </Dialog>
    );
}
```

### Paso 2: Exportar en `features/[feature]/index.ts`

```tsx
export { EntityFormModal } from "./entity-form-modal";
```

### Paso 3: Usar en página

```tsx
import { EntityFormModal } from "@/features/[feature]";

// En el componente:
const [modalOpen, setModalOpen] = useState(false);

return (
    <>
        <Button onClick={() => setModalOpen(true)}>Crear Nuevo</Button>
        <EntityFormModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            onSuccess={() => refreshData()}
        />
    </>
);
```

---

## 2. Crear un Drawer de Propiedades

// turbo

### Archivo en `features/[feature]/[entity]-properties-drawer.tsx`

```tsx
import { RightDrawer } from "@/components/ui/right-drawer";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    entity: Entity;
    onChange: (updates: Partial<Entity>) => void;
}

export function EntityPropertiesDrawer({ isOpen, onClose, entity, onChange }: Props) {
    return (
        <RightDrawer isOpen={isOpen} onClose={onClose} title="Propiedades">
            <div className="space-y-4">
                {/* Campos de edición */}
                <label className="block">
                    <span className="text-sm font-medium">Nombre</span>
                    <input
                        value={entity.name}
                        onChange={(e) => onChange({ name: e.target.value })}
                        className="w-full mt-1 px-3 py-2 border rounded-lg"
                    />
                </label>
            </div>
        </RightDrawer>
    );
}
```

---

## 3. Usar Confirmaciones (useConfirm)

// turbo-all

### Paso 1: Asegurar que ConfirmProvider esté en el layout (ya está en dashboard/layout.tsx)

### Paso 2: Usar el hook en cualquier componente

```tsx
import { useConfirm } from "@/components/ui/confirm-modal";

function MyComponent() {
    const confirm = useConfirm();

    const handleDelete = async () => {
        const confirmed = await confirm({
            title: "Eliminar elemento",
            message: "¿Estás seguro de que deseas eliminar este elemento? Esta acción no se puede deshacer.",
            confirmText: "Eliminar",
            cancelText: "Cancelar",
            variant: "danger" // "danger" | "warning" | "default"
        });

        if (confirmed) {
            await deleteEntity();
            refreshData();
        }
    };

    return <button onClick={handleDelete}>Eliminar</button>;
}
```

---

## 4. Reglas de Arquitectura

### ❌ NUNCA hacer en páginas (page.tsx):

1. Definir forms inline con useState para formData
2. Definir lógica de validación de forms
3. Tener el JSX de Dialog/Drawer con contenido complejo
4. Usar `confirm()` nativo - usar `useConfirm()` en su lugar

### ✅ Las páginas SOLO deben:

1. Importar componentes de `@/features/[feature]`
2. Manejar estado de apertura/cierre de modals (`useState<boolean>`)
3. Pasar callbacks como `onSuccess`, `onClose`
4. Renderizar componentes importados

---

## 5. Estructura de Carpetas

```
features/
├── customers/
│   ├── customer-card.tsx
│   ├── customer-form-modal.tsx      # <-- Modals de form
│   ├── customer-profile-modal.tsx   # <-- Modals de vista
│   └── index.ts
├── floor-plan/
│   ├── core/
│   └── wrappers/
├── team/
│   └── invite-member-modal.tsx
└── [feature]/
    ├── [entity]-form-modal.tsx
    ├── [entity]-properties-drawer.tsx
    └── index.ts

components/
├── ui/
│   ├── dialog.tsx           # Base modal (NO modificar)
│   ├── right-drawer.tsx     # Base drawer (NO modificar)
│   └── confirm-modal.tsx    # Sistema confirmación (NO modificar)
└── layout/
```

---

## 6. Checklist Antes de Crear UI

- [ ] ¿Es un Modal o Drawer?
- [ ] ¿Es para crear/editar (form) o solo mostrar info?
- [ ] ¿En qué feature va?
- [ ] ¿Necesito confirmación? → usar `useConfirm()`
- [ ] ¿Exporté en `index.ts` del feature?
