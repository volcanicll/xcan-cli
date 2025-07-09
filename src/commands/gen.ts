import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import shell from "shelljs";
import inquirer from "inquirer";
import fs from "fs";
import path from "path";

const genCommand = new Command("gen");

genCommand.description("Generate a file from a template").action(() => {
  const questions = [
    {
      name: "file-type",
      type: "list",
      message: "What type of file do you want to generate?",
      choices: ["component", "page", "service", "directive"],
    },
    {
      name: "file-name",
      type: "input",
      message: "File name:",
      validate: function (input: string) {
        if (/^([A-Za-z\-\d])+$/.test(input)) return true;
        else return "File name may only include letters, numbers, and hashes.";
      },
    },
  ];

  inquirer.prompt(questions).then((answers) => {
    const fileType = answers["file-type"];
    const fileName = answers["file-name"];
    const templatePath = path.join(__dirname, `../templates/${fileType}`);
    const targetPath = path.join(process.cwd(), fileName);
    const spinner = ora("Generating file...").start();

    if (!fs.existsSync(templatePath)) {
      spinner.fail(`Template for ${fileType} does not exist.`);
      return;
    }

    if (fs.existsSync(targetPath)) {
      spinner.fail(
        `Folder ${targetPath} already exists. Delete or use another name.`
      );
      return;
    }

    shell.mkdir("-p", targetPath);
    shell.cp("-R", path.join(templatePath, "*"), targetPath);

    spinner.succeed("File generated successfully!");
    console.log(chalk.green(`Successfully generated file at ${targetPath}`));
  });
});

export default genCommand;
