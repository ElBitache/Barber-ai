require("dotenv").config({ path: ".env.local" });

const bcrypt = require("bcryptjs");
const readline = require("readline");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Escribe tu contraseña: ", async (password) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        email: "prueba@test.com",
      },
    });

    if (!user) {
      console.log("USUARIO NO ENCONTRADO");
      return;
    }

    const correct = await bcrypt.compare(
      password,
      user.password
    );

    console.log(
      correct
        ? "CONTRASEÑA CORRECTA"
        : "CONTRASEÑA INCORRECTA"
    );
  } catch (error) {
    console.error("ERROR:", error.message);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
});
