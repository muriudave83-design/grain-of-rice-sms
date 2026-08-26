export function fitAssignmentMenuToViewport({ clientX, clientY, viewportWidth, viewportHeight, menuWidth = 224, menuHeight = 160, padding = 8 }) {
  const opensLeft = clientX + menuWidth + padding > viewportWidth;
  const preferredX = opensLeft ? clientX - menuWidth : clientX;
  return {
    x: Math.max(padding, Math.min(preferredX, viewportWidth - menuWidth - padding)),
    y: Math.max(padding, Math.min(clientY, viewportHeight - menuHeight - padding)),
    opensLeft,
  };
}
