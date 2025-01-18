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
        typeRole: 'admin',
        description: 'Sinh viên đóng vai trò quản lý điểm rèn luyện của lớp',
    },
    {
        roleCode: 'CV',
        name: 'Cố Vấn',
        typeRole: 'admin',
        description: 'Giảng viên cố vấn của lớp',
    },
    {
        roleCode: 'BCHK',
        name: 'Ban Chấp Hành Đoàn Khoa',
        typeRole: 'admin',
        description: 'Quản lý tất cả hoạt động của sinh viên trong Khoa',
    },
];

module.exports = roleList;
