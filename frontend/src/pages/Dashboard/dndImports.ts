/**
 * Barrel re-export for @dnd-kit dependencies used in EnhancedDashboard.
 */
export {
  DndContext,
  closestCenter,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
export type { DragStartEvent, DragEndEvent } from "@dnd-kit/core";
export {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
export { CSS } from "@dnd-kit/utilities";
