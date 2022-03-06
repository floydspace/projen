import { Construct } from "constructs";
import { Component } from "../component";
import { Dependency, DependencyType } from "../dependencies";
import { Task } from "../task";
import { TaskRuntime } from "../task-runtime";
import { IPackageProvider, IPythonDeps } from "./python-deps";
import { PythonProject } from "./python-project";
import { RequirementsFile } from "./requirements-file";

/**
 * Options for pip
 */
export interface PipOptions {}

/**
 * Manages dependencies using a requirements.txt file and the pip CLI tool.
 */
export class Pip extends Component implements IPythonDeps {
  public readonly installTask: Task;

  constructor(scope: Construct, _options: PipOptions = {}) {
    super(scope, "Pip");

    const project = PythonProject.ofPython(this);

    new RequirementsFile(project, "requirements.txt", {
      packageProvider: new RuntimeDependencyProvider(project),
    });
    new RequirementsFile(project, "requirements-dev.txt", {
      packageProvider: new DevDependencyProvider(project),
    });

    this.installTask = project.addTask("install", {
      description: "Install and upgrade dependencies",
    });
    this.installTask.exec("pip install --upgrade pip");
    this.installTask.exec("pip install -r requirements.txt");
    this.installTask.exec("pip install -r requirements-dev.txt");
  }

  /**
   * Adds a runtime dependency.
   *
   * @param spec Format `<module>@<semver>`
   */
  public addDependency(spec: string) {
    PythonProject.ofPython(this).deps.addDependency(
      spec,
      DependencyType.RUNTIME
    );
  }

  /**
   * Adds a dev dependency.
   *
   * @param spec Format `<module>@<semver>`
   */
  public addDevDependency(spec: string) {
    PythonProject.ofPython(this).deps.addDependency(
      spec,
      DependencyType.DEVENV
    );
  }

  /**
   * Installs dependencies (called during post-synthesis).
   */
  public installDependencies() {
    PythonProject.ofPython(this).logger.info("Installing dependencies...");

    const runtime = new TaskRuntime(PythonProject.ofPython(this).outdir);
    runtime.runTask(this.installTask.name);
  }
}

class RuntimeDependencyProvider implements IPackageProvider {
  constructor(private readonly pythonProject: PythonProject) {}
  public get packages(): Dependency[] {
    return this.pythonProject.deps.all.filter(
      (dep) => dep.type === DependencyType.RUNTIME
    );
  }
}

class DevDependencyProvider implements IPackageProvider {
  constructor(private readonly pythonProject: PythonProject) {}
  public get packages(): Dependency[] {
    return this.pythonProject.deps.all.filter(
      (dep) => dep.type === DependencyType.DEVENV
    );
  }
}
