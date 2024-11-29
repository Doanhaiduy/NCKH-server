// [
//     {
//         _id: {
//             $oid: '66da59e4a8ef21d84a9b1e17',
//         },
//         roleCode: 'SV',
//         name: 'Sinh Viên',
//         typeRole: 'user',
//         description: 'Sinh viên không giữ bất cứ chức vụ nào trong lớp',
//         permissions: [],
//         createdAt: {
//             $date: '2024-09-06T01:24:52.113Z',
//         },
//         updatedAt: {
//             $date: '2024-09-06T01:24:52.113Z',
//         },
//     },
//     {
//         _id: {
//             $oid: '66da5a4ba8ef21d84a9b1e1f',
//         },
//         roleCode: 'BCS',
//         name: 'Ban Cán Sự',
//         typeRole: 'user',
//         description: 'Sinh viên giữ chức vụ bất kỳ trong lớp',
//         permissions: [],
//         createdAt: {
//             $date: '2024-09-06T01:26:35.104Z',
//         },
//         updatedAt: {
//             $date: '2024-09-06T01:26:35.104Z',
//         },
//     },
//     {
//         _id: {
//             $oid: '66da5a86a8ef21d84a9b1e23',
//         },
//         roleCode: 'CBL',
//         name: 'Cán Bộ Lớp',
//         typeRole: 'manager',
//         description: 'Sinh viên đóng vai trò quản lý điểm rèn luyện của lớp',
//         permissions: [],
//         createdAt: {
//             $date: '2024-09-06T01:27:34.275Z',
//         },
//         updatedAt: {
//             $date: '2024-09-06T01:27:34.275Z',
//         },
//     },
//     {
//         _id: {
//             $oid: '66da5ab1a8ef21d84a9b1e27',
//         },
//         roleCode: 'CV',
//         name: 'Cố Vấn',
//         typeRole: 'manager',
//         description: 'Giảng viên cố vấn của lớp',
//         permissions: [],
//         createdAt: {
//             $date: '2024-09-06T01:28:17.152Z',
//         },
//         updatedAt: {
//             $date: '2024-09-06T01:28:17.152Z',
//         },
//     },
//     {
//         _id: {
//             $oid: '66da5ad9a8ef21d84a9b1e2b',
//         },
//         roleCode: 'BCHK',
//         name: 'Ban Chấp Hành Đoàn Khoa',
//         typeRole: 'manager',
//         description: 'Quản lý tất cả hoạt động của sinh viên trong Khoa',
//         permissions: [],
//         createdAt: {
//             $date: '2024-09-06T01:28:57.350Z',
//         },
//         updatedAt: {
//             $date: '2024-09-06T01:28:57.350Z',
//         },
//     },
// ];

const roleList = [
    {
        roleCode: 'SV',
        name: 'Sinh Viên',
        typeRole: 'user',
        description: 'Sinh viên không giữ bất cứ chức vụ nào trong lớp',
    },
    {
        roleCode: 'BCS',
        name: 'Ban Cán Sự',
        typeRole: 'user',
        description: 'Sinh viên giữ chức vụ bất kỳ trong lớp',
    },
    {
        roleCode: 'CBL',
        name: 'Cán Bộ Lớp',
        typeRole: 'manager',
        description: 'Sinh viên đóng vai trò quản lý điểm rèn luyện của lớp',
    },
    {
        roleCode: 'CV',
        name: 'Cố Vấn',
        typeRole: 'manager',
        description: 'Giảng viên cố vấn của lớp',
    },
    {
        roleCode: 'BCHK',
        name: 'Ban Chấp Hành Đoàn Khoa',
        typeRole: 'manager',
        description: 'Quản lý tất cả hoạt động của sinh viên trong Khoa',
    },
];

module.exports = roleList;
