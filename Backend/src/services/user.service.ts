import prisma from "./prisma.service";

export const findUserByEmail = async (email: string) => {
  return prisma.user.findUnique({
    where: {
      email,
    },
  });
};

export const createUser = async (
  email: string,
  name: string | undefined,
  cognitoId: string
) => {
  return prisma.user.create({
    data: {
      email,
      name: name || undefined,
      cognitoId,
    },
  });
};

export const updateUserByEmail = async (
  email: string,
  data: { name?: string }
) => {
  return prisma.user.update({
    where: { email },
    data,
  });
};
