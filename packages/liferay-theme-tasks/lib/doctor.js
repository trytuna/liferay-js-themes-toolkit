const _ = require('lodash');
const colors = require('ansi-colors');
const log = require('fancy-log');

const lfrThemeConfig = require('./liferay_theme_config');

// This array contains all theme versions supported for non-upgrade tasks
const supportedThemeVersions = ['7.0', '7.1', '7.2'];

// This array contains all theme versions supported for upgrade tasks
const supportedUpgradeVersions = ['6.2', '7.0'];

function doctor({
	themeConfig = null,
	haltOnMissingDeps = false,
	tasks = [],
} = {}) {
	themeConfig = themeConfig || lfrThemeConfig.getConfig(true);

	if (!themeConfig) {
		return;
	}

	const liferayVersion = themeConfig.liferayTheme.version;

	assertTasksSupported(themeConfig.liferayTheme.version, tasks);

	let dependencies = themeConfig.dependencies || {};

	if (!_.isEmpty(themeConfig.devDependencies)) {
		dependencies = _.defaults(dependencies, themeConfig.devDependencies);
	}

	if (!_.isUndefined(themeConfig.liferayTheme.supportCompass)) {
		lfrThemeConfig.removeConfig(['supportCompass']);
	}

	const missingDeps = checkMissingDeps(liferayVersion, dependencies);

	checkDependencySources(themeConfig.liferayTheme);

	if (haltOnMissingDeps) {
		haltTask(missingDeps);
	}
}

module.exports = {
	doctor,
};

/**
 * Check if a given array of tasks is supported for the current theme version.
 * @param {String} version the theme version
 * @param {Array} tasks the list of tasks requested through the CLI
 * @throws if any of the tasks is not supported in the given version
 */
function assertTasksSupported(version, tasks) {
	for (let i = 0; i < tasks.length; i++) {
		const task = tasks[i];

		switch (task) {
			case 'help':
			case 'init':
				break;

			case 'upgrade':
				if (supportedUpgradeVersions.indexOf(version) == -1) {
					throw new Error(
						`Task '${task}' is not supported for themes with ` +
							`version '${version}' in this version of ` +
							`'liferay-theme-tasks'`
					);
				}
				break;

			default:
				if (supportedThemeVersions.indexOf(version) == -1) {
					throw new Error(
						`Task '${task}' is not supported for themes with ` +
							`version '${version}' in this version of ` +
							`'liferay-theme-tasks'`
					);
				}
				break;
		}
	}
}

function checkDependencySources(liferayTheme) {
	const baseTheme = liferayTheme.baseTheme;
	const themeletDependencies = liferayTheme.themeletDependencies;

	const localDependencies = [];

	if (_.isObject(baseTheme) && baseTheme.path) {
		localDependencies.push(baseTheme);
	}

	if (themeletDependencies) {
		_.forEach(themeletDependencies, function(item) {
			if (item.path) {
				localDependencies.push(item);
			}
		});
	}

	if (localDependencies.length) {
		logLocalDependencies(localDependencies);
	}
}

function checkMissingDeps(version, dependencies) {
	let missingDeps = 0;

	missingDeps = logMissingDeps(
		dependencies,
		`liferay-theme-deps-${version}`,
		missingDeps
	);

	return missingDeps;
}

function haltTask(missingDeps) {
	if (missingDeps > 0) {
		throw new Error('Missing ' + missingDeps + ' theme dependencies');
	}
}

function logLocalDependencies(localDependencies) {
	const dependenciesString = _.map(localDependencies, function(item) {
		return item.name;
	}).join(', ');

	log(
		colors.yellow('Warning:'),
		'you have dependencies that are installed from local modules. These should only be used for development purposes. Do not publish this npm module with those dependencies!'
	);
	log(colors.yellow('Local module dependencies:'), dependenciesString);
}

function logMissingDeps(dependencies, moduleName, missingDeps) {
	if (!dependencies[moduleName]) {
		log(
			colors.red('Warning:'),
			'You must install the correct dependencies, please run',
			colors.cyan('npm i --save-dev ' + moduleName),
			'from your theme directory.'
		);

		missingDeps++;
	}

	return missingDeps;
}
