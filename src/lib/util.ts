export const PI = Math.PI;
export const REV = 2 * PI;
export const PI_2 = PI / 2;

export const mod = (a: number, b: number) => {
    const remainder = a % b;

    if (remainder < 0) {
        return remainder + b;
    }
    return remainder;
};