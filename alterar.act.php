<?php

require('connect.php');
extract($_POST);
              

if(mysqli_query($con,"UPDATE `tb_cliente` SET `nome` = '$nome', `email` = '$email', `telefone` = '$telefone', 
    `data` = '$data', `cpf` = '$cpf', `foto` = '$foto_anterior' 
            WHERE `tb_cliente`.`codigo` = '$codigo';")){
    $msg = "Contato gravado com sucesso!";
}else{
    $msg = "Erro ao gravar";
}
    


session_start();
$_SESSION['msg'] = $msg;

echo mysqli_error($con);

header("location:listar.php");
?>