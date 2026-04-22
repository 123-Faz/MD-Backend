import bcrypt from 'bcryptjs'

export const generateSalt = async (rounds: number) => {
    return await bcrypt.genSalt(rounds);
}

export const hashPassword = async (password: string) => {
    const salt = await generateSalt(12);
    return await bcrypt.hash(password, salt)
}

export const comparePassword = async (userPassword: string, dbPassword: string) => {
    return await bcrypt.compare(userPassword, dbPassword);
}