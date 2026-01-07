export const GRID_SIZE = 10;

export const snapToGrid = (value: number): number => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
};

export const getGridPosition = (value: number): number => {
    return Math.floor(value / GRID_SIZE);
};
