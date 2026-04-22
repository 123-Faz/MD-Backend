export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));


export const isValidJson = (str: string) => {
    try {
        JSON.parse(str)
    }
    catch (e) {
        return false
    }
    return true
}