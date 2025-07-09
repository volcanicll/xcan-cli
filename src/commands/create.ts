import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import shell from "shelljs";
import inquirer from "inquirer";
import fs from "fs";
import path from "path";

const createCommand = new Command("create");

const CHOICES = fs.readdirSync(path.join(__dirname, "../templates"));
CHOICES.push("remote");

createCommand.description("Create a new project from a template").action(() => {
  const questions = [
    {
      name: "project-choice",
      type: "list",
      message: "What project template would you like to generate?",
      choices: CHOICES,
    },
    {
      name: "project-name",
      type: "input",
      message: "Project name:",
      validate: function (input: string) {
        if (/^([A-Za-z\-\d])+$/.test(input)) return true;
        else
          return "Project name may only include letters, numbers, and hashes.";
      },
    },
  ];

  inquirer.prompt(questions).then((answers) => {
    const projectChoice = answers["project-choice"];
    const projectName = answers["project-name"];
    const targetPath = path.join(process.cwd(), projectName);
    const spinner = ora().start();

    if (fs.existsSync(targetPath)) {
      spinner.fail(
        `Folder ${targetPath} already exists. Delete or use another name.`
      );
      return;
    }

    if (projectChoice === "remote") {
      const remoteQuestions = [
        {
          name: "repo-url",
          type: "input",
          message: "Enter the remote repository URL:",
        },
      ];
      spinner.succeed("Creating project from remote template...");
      inquirer.prompt(remoteQuestions).then((remoteAnswers) => {
        const repoUrl = remoteAnswers["repo-url"];
        shell.exec(
          `git clone ${repoUrl} ${projectName}`,
          (code, stdout, stderr) => {
            if (code !== 0) {
              spinner.fail(`Error cloning repository: ${stderr}`);
              return;
            }
            spinner.succeed(
              "Project created successfully from remote template!"
            );
            console.log(
              chalk.green(`Successfully created project at ${targetPath}`)
            );
          }
        );
      });
    } else {
      const templatePath = path.join(
        __dirname,
        "../templates",
        projectChoice
      );
      shell.mkdir("-p", targetPath);
      shell.cp("-R", path.join(templatePath, "*"), targetPath);
      spinner.succeed("Project created successfully!");
      console.log(chalk.green(`Successfully created project at ${targetPath}`));
    }
  });
});

export default createCommand;
