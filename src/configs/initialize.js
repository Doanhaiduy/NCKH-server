const SemesterYear = require('../models/semesterYearModel');
const Role = require('../models/roleModel');
const semesterYearList = require('../mocks/semesterYearList');
const roleList = require('../mocks/roleList');

const initializeSemesterYears = async () => {
    const defaultData = semesterYearList.map(({ year, semester }) => ({ year, semester }));

    for (const data of defaultData) {
        await SemesterYear.updateOne({ year: data.year, semester: data.semester }, data, { upsert: true });
    }
    console.log('Semester years initialized');
};

const initializedRoles = async () => {
    const defaultData = roleList.map(({ roleCode, name, typeRole, description }) => ({
        roleCode,
        name,
        typeRole,
        description,
    }));
    for (const role of defaultData) {
        await Role.updateOne({ roleCode: role.roleCode }, role, { upsert: true });
    }
    console.log('Roles initialized');
};

module.exports = {
    initializeSemesterYears,
    initializedRoles,
};
