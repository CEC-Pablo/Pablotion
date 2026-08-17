/**
 * Datos de muestra del botón «Ver un ejemplo» del estado vacío.
 * Se escriben en la base como entradas normales: nada aquí es especial.
 */

import { createEntry, listTags } from '../../lib/db/queries';

export async function loadSampleData(): Promise<void> {
  const tags = await listTags();
  const byName = (name: string) => tags.find((t) => t.name === name)?.id ?? null;

  await createEntry({
    type: 'reminder',
    title: 'Entregar el formulario de la beca',
    tag_id: byName('Universidad'),
  });
  await createEntry({
    type: 'task',
    title: 'Comprar café para la sala del centro',
    tag_id: byName('Centro de Estudiantes'),
    priority: 'medium',
  });
  await createEntry({
    type: 'note',
    title: 'Idea: rifa para financiar el viaje de egreso',
    tag_id: byName('Ideas'),
  });
}
