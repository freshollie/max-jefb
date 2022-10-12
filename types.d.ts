declare module '@combinatorics/n-multicombinations' {
    export const multicombinations: <T>(iterable: Iterable<T>, r: number) => IterableIterator<T[]>;
}
